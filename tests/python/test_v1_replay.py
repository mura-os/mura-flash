from __future__ import annotations

import hashlib

import pytest

from mura_flash.errors import RecipeInvalidError, SafetyRefusalError
from mura_flash.jsonio import canonical_json
from mura_flash.procedure import create_live_adapter, plan_procedure
from mura_flash.replay import REDACTION, EventTranscript, replay_scenario
from mura_flash.v1_catalog import load_procedure_catalog, load_target_catalog
from mura_flash.v1_validation import (
    decode_v1_document,
    load_operation_registry,
    load_v1_contract,
    validate_procedure_graph,
)


def _citation() -> list[dict[str, object]]:
    return [
        {
            "kind": "repository",
            "path": "tests/python/test_v1_replay.py",
            "lineStart": 1,
            "lineEnd": 1,
        }
    ]


def _operation(operation_id: str, *, enabled: bool) -> dict[str, object]:
    return {
        "id": operation_id,
        "variant": "wait",
        "enabled": enabled,
        "arguments": [
            {
                "inputName": "duration",
                "value": {"kind": "constant", "valueType": "duration-ms", "value": 5},
            }
        ],
        "guards": [
            {
                "kind": "equals",
                "left": {"kind": "constant", "valueType": "boolean", "value": True},
                "right": {"kind": "constant", "valueType": "boolean", "value": True},
            }
        ],
        "postconditions": [
            {
                "kind": "equals",
                "left": {"kind": "constant", "valueType": "duration-ms", "value": 5},
                "right": {"kind": "constant", "valueType": "duration-ms", "value": 5},
            }
        ],
        "failureEdges": [{"failureClass": "interrupted", "recoveryId": "recover"}],
        "engineFailureEdges": [
            {"failureClass": "postcondition-failed", "recoveryId": "recover"},
            {"failureClass": "interrupted", "recoveryId": "recover"},
        ],
        "fromStates": [{"kind": "state", "stateId": "ready"}],
        "toState": None,
        "idempotence": "idempotent",
        "sourceCitations": _citation(),
    }


def _procedure(*, enabled_operation: bool = False) -> dict[str, object]:
    return {
        "schema": "org.mura.flash.install-procedure/v1",
        "id": "synthetic-procedure",
        "targetId": "synthetic-target",
        "enabled": False,
        "sourceBehavior": {
            "summary": "Synthetic replay fixture.",
            "evidenceLevel": "source-documented",
        },
        "sourceGaps": ["Synthetic fixture is not a live procedure."],
        "sourceParity": {"path": "tests/fixtures/source-parity/synthetic/synthetic-procedure.json"},
        "runtimeInputs": [],
        "states": [{"id": "ready", "kind": "flow", "initial": True}],
        "artifacts": [],
        "partitions": [],
        "backups": [],
        "confirmations": [],
        "operations": [
            _operation("main-wait", enabled=enabled_operation),
            _operation("recovery-wait", enabled=False),
        ],
        "flows": [
            {
                "id": "simulate",
                "enabled": False,
                "initialState": {"kind": "state", "stateId": "ready"},
                "steps": [{"kind": "operation", "operationId": "main-wait"}],
                "guards": [],
                "confirmations": [],
            }
        ],
        "recovery": [
            {
                "id": "recover",
                "fromStates": [{"kind": "state", "stateId": "ready"}],
                "steps": [{"kind": "operation", "operationId": "recovery-wait"}],
                "terminalState": {"kind": "state", "stateId": "ready"},
            }
        ],
        "sourceCitations": _citation(),
    }


def _scenario(
    *,
    capabilities: list[str] | None = None,
    expected_error: str | None = None,
) -> dict[str, object]:
    event_kinds = (
        ["session-start", "session-end"]
        if expected_error == "capability-missing"
        else [
            "session-start",
            "operation-would-execute",
            "operation-success",
            "session-end",
        ]
    )
    return {
        "schema": "org.mura.flash.replay-scenario/v1",
        "id": "synthetic-scenario",
        "procedureId": "synthetic-procedure",
        "flowId": "simulate",
        "simulateDisabled": True,
        "clock": {"startTimestamp": "2026-01-02T03:04:05.000Z", "tickMs": 10},
        "operationDurations": [
            {"operationId": "main-wait", "durationMs": 5},
            {"operationId": "recovery-wait", "durationMs": 7},
        ],
        "adapterCapabilities": capabilities or [],
        "inputs": [],
        "responses": [
            {
                "kind": "success",
                "operationId": "main-wait",
                "outputs": [{"name": "elapsed", "type": "duration-ms", "value": 5}],
            }
        ],
        "expected": {
            "terminalStateId": "ready",
            "eventKinds": event_kinds,
            "errorCode": expected_error,
        },
    }


def test_bundled_v1_authority_and_catalogs_load() -> None:
    assert load_v1_contract()["schema"] == "org.mura.flash.contract/v1"
    assert load_operation_registry()["schema"] == "org.mura.flash.procedure-registry/v1"
    assert len(load_target_catalog().targets) == 15
    assert load_procedure_catalog().procedures


def test_raw_v1_json_rejects_duplicates_before_schema_validation() -> None:
    with pytest.raises(RecipeInvalidError, match="duplicate object key"):
        decode_v1_document('{"schema":"org.mura.flash.target-record/v1","schema":"duplicate"}')


def test_canonical_json_is_utf8_compact_sorted_and_finite() -> None:
    assert canonical_json({"z": "é", "a": 1}) == '{"a":1,"z":"é"}'
    with pytest.raises(ValueError, match="canonical JSON"):
        canonical_json({"number": float("inf")})


def test_graph_validator_rejects_unresolved_recovery() -> None:
    procedure = _procedure()
    operation = procedure["operations"][0]
    assert isinstance(operation, dict)
    operation["failureEdges"][0]["recoveryId"] = "missing"
    issues = validate_procedure_graph(procedure, load_operation_registry())
    assert any("unresolved recovery reference" in issue.message for issue in issues)


def test_disabled_live_operation_is_would_execute_in_replay() -> None:
    procedure = _procedure()
    plan = plan_procedure(procedure, flow_id="simulate")
    assert plan.steps[0].enabled is False
    assert plan.steps[0].would_execute is False

    first = replay_scenario(procedure, _scenario())
    second = replay_scenario(procedure, _scenario())
    assert first.matched_expected is True
    assert first.plan.steps[0].would_execute is True
    assert first.to_document() == second.to_document()
    assert [event["sequence"] for event in first.events] == [0, 1, 2, 3]
    for index, event in enumerate(first.events):
        without_hash = {key: value for key, value in event.items() if key != "eventHash"}
        expected_hash = hashlib.sha256(canonical_json(without_hash).encode()).hexdigest()
        assert event["eventHash"] == expected_hash
        assert event["previousHash"] == (
            None if index == 0 else first.events[index - 1]["eventHash"]
        )


def test_declared_failure_edge_runs_typed_recovery() -> None:
    scenario = _scenario()
    scenario["responses"] = [
        {
            "kind": "failure",
            "operationId": "main-wait",
            "failureClass": "interrupted",
        },
        {
            "kind": "success",
            "operationId": "recovery-wait",
            "outputs": [{"name": "elapsed", "type": "duration-ms", "value": 5}],
        },
    ]
    scenario["expected"] = {
        "terminalStateId": "ready",
        "eventKinds": [
            "session-start",
            "operation-would-execute",
            "operation-failure",
            "recovery-start",
            "operation-would-execute",
            "operation-success",
            "session-end",
        ],
        "errorCode": "interrupted",
    }
    result = replay_scenario(_procedure(), scenario)
    assert result.matched_expected is True
    assert result.error_code == "interrupted"


def test_disabled_simulation_requires_no_adapter_capability() -> None:
    result = replay_scenario(_procedure(), _scenario())
    assert result.plan.required_capabilities == ()
    assert result.plan.missing_capabilities == ()


def test_confirmation_decline_stops_before_operation() -> None:
    procedure = _procedure()
    procedure["confirmations"] = [
        {
            "id": "confirm-simulation",
            "safetyClasses": ["host-read"],
            "prompt": "Confirm the synthetic simulation.",
        }
    ]
    procedure["flows"][0]["confirmations"] = [
        {"kind": "confirmation", "confirmationId": "confirm-simulation"}
    ]
    scenario = _scenario()
    scenario["inputs"] = [{"name": "confirmation0", "type": "boolean", "value": False}]
    scenario["expected"] = {
        "terminalStateId": "ready",
        "eventKinds": ["session-start", "confirmation", "session-end"],
        "errorCode": "confirmation-declined",
    }
    result = replay_scenario(procedure, scenario)
    assert result.matched_expected is True


def test_transcript_redacts_before_hashing() -> None:
    transcript = EventTranscript("redaction-session", ["private-token"])
    event = transcript.append(
        {
            "kind": "operation-success",
            "operationId": "synthetic-operation",
            "outputs": [
                {
                    "name": "value",
                    "type": "string",
                    "value": "prefix-private-token-suffix",
                }
            ],
            "durationMs": 4,
        }
    )
    assert "private-token" not in canonical_json(event)
    assert REDACTION in canonical_json(event)


def test_explicit_transition_occurs_only_after_postconditions_pass() -> None:
    procedure = _procedure()
    procedure["states"].append({"id": "finished", "kind": "flow", "initial": False})
    operation = procedure["operations"][0]
    operation["toState"] = {"kind": "state", "stateId": "finished"}
    operation["postconditions"] = [
        {
            "kind": "equals",
            "left": {
                "kind": "operation-output",
                "operationId": "main-wait",
                "outputName": "elapsed",
            },
            "right": {"kind": "constant", "valueType": "duration-ms", "value": 5},
        }
    ]
    scenario = _scenario()
    scenario["expected"] = {
        "terminalStateId": "finished",
        "eventKinds": [
            "session-start",
            "operation-would-execute",
            "state-transition",
            "operation-success",
            "session-end",
        ],
        "errorCode": None,
    }
    result = replay_scenario(procedure, scenario)
    assert result.matched_expected is True

    failing = _scenario()
    failing["responses"] = [
        {
            "kind": "success",
            "operationId": "main-wait",
            "outputs": [{"name": "elapsed", "type": "duration-ms", "value": 4}],
        },
        {
            "kind": "success",
            "operationId": "recovery-wait",
            "outputs": [{"name": "elapsed", "type": "duration-ms", "value": 5}],
        },
    ]
    failing["expected"] = {
        "terminalStateId": "ready",
        "eventKinds": [
            "session-start",
            "operation-would-execute",
            "operation-failure",
            "recovery-start",
            "operation-would-execute",
            "operation-success",
            "session-end",
        ],
        "errorCode": "postcondition-failed",
    }
    failed = replay_scenario(procedure, failing)
    assert failed.matched_expected is True
    assert all(event["payload"]["kind"] != "state-transition" for event in failed.events)


def test_engine_interruption_uses_engine_terminal_disposition() -> None:
    procedure = _procedure()
    operation = procedure["operations"][0]
    operation["engineFailureEdges"][1] = {
        "failureClass": "interrupted",
        "terminalFailure": True,
    }
    scenario = _scenario()
    scenario["responses"].append({"kind": "interruption", "afterOperationId": "main-wait"})
    scenario["expected"] = {
        "terminalStateId": "ready",
        "eventKinds": [
            "session-start",
            "operation-would-execute",
            "operation-failure",
            "session-end",
        ],
        "errorCode": "interrupted",
    }
    result = replay_scenario(procedure, scenario)
    assert result.matched_expected is True


def test_runtime_input_and_digest_tags_are_strict() -> None:
    procedure = _procedure()
    procedure["runtimeInputs"] = [{"id": "delay", "type": "duration-ms", "required": True}]
    procedure["operations"][0]["arguments"][0]["value"] = {
        "kind": "runtime-input",
        "inputId": "delay",
    }
    scenario = _scenario()
    scenario["inputs"] = [{"name": "delay", "type": "duration-ms", "value": 5}]
    assert replay_scenario(procedure, scenario).matched_expected is True

    scenario["inputs"] = []
    with pytest.raises(RecipeInvalidError, match="missing required runtime input"):
        replay_scenario(procedure, scenario)

    invalid_digest = _scenario()
    invalid_digest["inputs"] = [{"name": "digestValue", "type": "digest", "value": "not-a-digest"}]
    with pytest.raises(RecipeInvalidError, match="lowercase SHA-256"):
        replay_scenario(_procedure(), invalid_digest)


def test_graph_validator_checks_explicit_state_references() -> None:
    procedure = _procedure()
    procedure["operations"][0]["fromStates"] = [{"kind": "state", "stateId": "missing"}]
    issues = validate_procedure_graph(procedure, load_operation_registry())
    assert any("unresolved state reference" in issue.message for issue in issues)


def test_live_safety_refusal_precedes_adapter_factory() -> None:
    called = False

    def factory() -> object:
        nonlocal called
        called = True
        return object()

    target = {
        "hardwareQualification": "unqualified",
        "enabled": False,
    }
    with pytest.raises(SafetyRefusalError):
        create_live_adapter(_procedure(), target, factory)
    assert called is False


def test_samsung_live_refusal_precedes_adapter_factory() -> None:
    called = False

    def factory() -> object:
        nonlocal called
        called = True
        return object()

    procedure = load_procedure_catalog().procedures[
        "samsung-galaxy-xr-ayke-to-ayia-rollback-unlock"
    ]
    target = load_target_catalog().targets["samsung-galaxy-xr-sm-i610"]
    with pytest.raises(SafetyRefusalError):
        create_live_adapter(procedure, target, factory)
    assert called is False
