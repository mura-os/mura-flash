"""Deterministic, I/O-free replay of frontend-neutral v1 procedures."""

from __future__ import annotations

import hashlib
from collections.abc import Iterable
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import cast

from mura_flash.errors import RecipeInvalidError
from mura_flash.jsonio import canonical_json
from mura_flash.procedure import ProcedurePlan, plan_procedure, select_flow
from mura_flash.v1_validation import (
    load_operation_registry,
    operation_index,
    validate_procedure_graph,
    validate_typed_value,
    validate_v1_document,
)
from mura_flash.validation import JsonObject

REDACTION = "<redacted>"


@dataclass(frozen=True, slots=True)
class TypedValue:
    """One value carrying the registry type used for exact matching."""

    type: str
    value: str | int | bool | list[str] | None


@dataclass(frozen=True, slots=True)
class ReplayResult:
    """Canonical replay result and transcript."""

    scenario_id: str
    procedure_id: str
    flow_id: str
    terminal_state_id: str
    error_code: str | None
    matched_expected: bool
    mismatches: tuple[str, ...]
    plan: ProcedurePlan
    events: tuple[JsonObject, ...]
    state_effects: tuple[JsonObject, ...]

    def to_document(self) -> dict[str, object]:
        return {
            "scenarioId": self.scenario_id,
            "procedureId": self.procedure_id,
            "flowId": self.flow_id,
            "terminalStateId": self.terminal_state_id,
            "errorCode": self.error_code,
            "matchedExpected": self.matched_expected,
            "mismatches": list(self.mismatches),
            "plan": self.plan.to_document(),
            "events": list(self.events),
            "stateEffects": list(self.state_effects),
        }


def redact_json(value: object, secrets: Iterable[str]) -> object:
    """Recursively redact exact secret substrings before hashing or serialization."""
    ordered = tuple(sorted((secret for secret in secrets if secret), key=len, reverse=True))
    if isinstance(value, str):
        for secret in ordered:
            value = value.replace(secret, REDACTION)
        return value
    if isinstance(value, list):
        return [redact_json(item, ordered) for item in value]
    if isinstance(value, dict):
        return {
            key: redact_json(child, ordered) for key, child in value.items() if isinstance(key, str)
        }
    return value


class EventTranscript:
    """Build schema-valid, redacted, hash-chained v1 events."""

    def __init__(
        self,
        session_id: str,
        secrets: Iterable[str] = (),
        *,
        start_timestamp: str = "2000-01-01T00:00:00.000Z",
        tick_ms: int = 1,
    ) -> None:
        self._session_id = session_id
        self._secrets = set(secrets)
        self._events: list[JsonObject] = []
        try:
            self._start = datetime.fromisoformat(start_timestamp.replace("Z", "+00:00"))
        except ValueError as error:
            raise RecipeInvalidError(
                f"invalid replay clock timestamp: {start_timestamp!r}"
            ) from error
        if self._start.tzinfo is None or self._start.utcoffset() != timedelta(0):
            raise RecipeInvalidError("replay clock timestamp must be UTC")
        if tick_ms < 1:
            raise RecipeInvalidError("replay clock tickMs must be positive")
        self._tick = timedelta(milliseconds=tick_ms)

    def add_secret(self, value: str) -> None:
        if value:
            self._secrets.add(value)

    def append(self, payload: JsonObject) -> JsonObject:
        if payload.get("kind") == "operation-success":
            typed_issues = [
                issue
                for index, value in enumerate(cast("list[JsonObject]", payload["outputs"]))
                for issue in validate_typed_value(
                    value,
                    path=f"payload.outputs.{index}",
                )
            ]
            if typed_issues:
                raise RecipeInvalidError(
                    "invalid transcript event: "
                    + "; ".join(issue.render() for issue in typed_issues)
                )
        sequence = len(self._events)
        timestamp = (
            (self._start + self._tick * sequence)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z")
        )
        event_without_hash: JsonObject = {
            "schema": "org.mura.flash.transcript-event/v1",
            "sessionId": self._session_id,
            "sequence": sequence,
            "timestamp": timestamp,
            "previousHash": self._events[-1]["eventHash"] if self._events else None,
            "payload": cast("JsonObject", redact_json(deepcopy(payload), self._secrets)),
        }
        event_hash = hashlib.sha256(canonical_json(event_without_hash).encode("utf-8")).hexdigest()
        event = {**event_without_hash, "eventHash": event_hash}
        issues = validate_v1_document(event, "org.mura.flash.transcript-event/v1")
        if issues:
            raise RecipeInvalidError(
                "invalid transcript event: " + "; ".join(issue.render() for issue in issues)
            )
        self._events.append(event)
        return event

    @property
    def events(self) -> tuple[JsonObject, ...]:
        return tuple(deepcopy(self._events))

    def canonical_jsonl(self) -> str:
        return "".join(f"{canonical_json(event)}\n" for event in self._events)


class _ReplayAbort(Exception):
    def __init__(self, error_code: str, operation_id: str | None = None) -> None:
        super().__init__(error_code)
        self.error_code = error_code
        self.operation_id = operation_id


class ReplayBackend:
    """Ordered scripted responses; deliberately has no I/O methods."""

    def __init__(self, responses: list[JsonObject]) -> None:
        self._responses = responses
        self._index = 0

    def operation_response(self, operation_id: str) -> JsonObject:
        if self._index >= len(self._responses):
            raise _ReplayAbort("replay-mismatch", operation_id)
        response = self._responses[self._index]
        if response["kind"] == "interruption" or response.get("operationId") != operation_id:
            raise _ReplayAbort("replay-mismatch", operation_id)
        self._index += 1
        return response

    def consume_interruption(self, operation_id: str) -> bool:
        if self._index >= len(self._responses):
            return False
        response = self._responses[self._index]
        if response["kind"] == "interruption" and response["afterOperationId"] == operation_id:
            self._index += 1
            return True
        return False

    @property
    def exhausted(self) -> bool:
        return self._index == len(self._responses)


class _ReplayEngine:
    def __init__(
        self,
        procedure: JsonObject,
        scenario: JsonObject,
        registry: JsonObject,
    ) -> None:
        self.procedure = procedure
        self.scenario = scenario
        self.registry = registry
        self.variants = operation_index(registry)
        self.operations = {
            cast("str", operation["id"]): operation
            for operation in cast("list[JsonObject]", procedure["operations"])
        }
        self.recoveries = {
            cast("str", recovery["id"]): recovery
            for recovery in cast("list[JsonObject]", procedure["recovery"])
        }
        self.flow = select_flow(procedure, cast("str", scenario["flowId"]))
        self.inputs = self._typed_values(cast("list[JsonObject]", scenario["inputs"]))
        self.outputs: dict[tuple[str, str], TypedValue] = {}
        self.states = {
            cast("str", state["id"]): cast("bool", state["initial"])
            for state in cast("list[JsonObject]", procedure["states"])
        }
        for state_id in self.states:
            supplied = self.inputs.get(state_id)
            if supplied is not None and isinstance(supplied.value, bool):
                self.states[state_id] = supplied.value
        self.current_state = cast("str", cast("JsonObject", self.flow["initialState"])["stateId"])
        self.backend = ReplayBackend(cast("list[JsonObject]", scenario["responses"]))
        clock = cast("JsonObject", scenario["clock"])
        self.transcript = EventTranscript(
            cast("str", scenario["id"]),
            start_timestamp=cast("str", clock["startTimestamp"]),
            tick_ms=cast("int", clock["tickMs"]),
        )
        self.durations = {
            cast("str", item["operationId"]): cast("int", item["durationMs"])
            for item in cast("list[JsonObject]", scenario["operationDurations"])
        }
        self.simulate_disabled = cast("bool", scenario["simulateDisabled"])
        self.state_effects: list[JsonObject] = []
        self.completed_operations: set[str] = set()
        self.secrets: set[str] = set()
        self._active_recoveries: set[str] = set()
        self._register_sensitive_inputs()

    @staticmethod
    def _typed_values(values: list[JsonObject]) -> dict[str, TypedValue]:
        result: dict[str, TypedValue] = {}
        for item in values:
            name = cast("str", item["name"])
            if name in result:
                raise RecipeInvalidError(f"duplicate typed value name: {name!r}")
            result[name] = TypedValue(
                cast("str", item["type"]),
                cast("str | int | bool | list[str] | None", item["value"]),
            )
        return result

    def _register_sensitive_inputs(self) -> None:
        for operation in self.operations.values():
            variant = self.variants[cast("str", operation["variant"])]
            sensitive = any(
                parameter["name"] == "sensitive-input" and parameter["value"] is True
                for parameter in cast("list[JsonObject]", variant["algorithmParameters"])
            )
            if not sensitive:
                continue
            for argument in cast("list[JsonObject]", operation["arguments"]):
                try:
                    value = self._resolve(cast("JsonObject", argument["value"]))
                except KeyError:
                    continue
                if isinstance(value.value, str):
                    self.secrets.add(value.value)
                    self.transcript.add_secret(value.value)

    @staticmethod
    def _has_sensitive_inputs(variant: JsonObject) -> bool:
        return any(
            parameter["name"] == "sensitive-input" and parameter["value"] is True
            for parameter in cast("list[JsonObject]", variant["algorithmParameters"])
        )

    def _resolve(self, reference: JsonObject) -> TypedValue:
        kind = reference["kind"]
        if kind == "constant":
            return TypedValue(
                cast("str", reference["valueType"]),
                cast("str | int | bool | list[str]", reference["value"]),
            )
        if kind == "operation-output":
            key = (
                cast("str", reference["operationId"]),
                cast("str", reference["outputName"]),
            )
            if key not in self.outputs:
                raise KeyError(key)
            return self.outputs[key]
        if kind == "runtime-input":
            input_id = cast("str", reference["inputId"])
            if input_id not in self.inputs:
                raise KeyError(input_id)
            return self.inputs[input_id]
        if kind == "state":
            state_id = cast("str", reference["stateId"])
            return TypedValue("state-ref", self.states[state_id])
        key_by_kind = {
            "artifact": ("artifactId", "artifact-ref"),
            "partition": ("partitionId", "partition-ref"),
            "backup": ("backupId", "backup-ref"),
        }
        reference_key, value_type = key_by_kind[cast("str", kind)]
        identifier = cast("str", reference[reference_key])
        return self.inputs.get(identifier, TypedValue(value_type, identifier))

    def _predicate(self, predicate: JsonObject) -> bool:
        kind = predicate["kind"]
        if kind == "state-assertion":
            state_id = cast("str", cast("JsonObject", predicate["state"])["stateId"])
            return self.states[state_id] is predicate["expected"]
        if kind == "output-present":
            reference = cast("JsonObject", predicate["value"])
            return (
                cast("str", reference["operationId"]),
                cast("str", reference["outputName"]),
            ) in self.outputs
        left = self._resolve(cast("JsonObject", predicate["left"]))
        right = self._resolve(cast("JsonObject", predicate["right"]))
        if left.type != right.type:
            return False
        if kind == "digest-equals" and left.type != "digest":
            return False
        equal = left.value == right.value
        return not equal if kind == "not-equals" else equal

    @staticmethod
    def _predicate_operation_ids(predicate: JsonObject) -> tuple[str, ...]:
        if predicate["kind"] == "state-assertion":
            return ()
        if predicate["kind"] == "output-present":
            value = cast("JsonObject", predicate["value"])
            return (cast("str", value["operationId"]),)
        result: list[str] = []
        for key in ("left", "right"):
            reference = cast("JsonObject", predicate[key])
            if reference["kind"] == "operation-output":
                result.append(cast("str", reference["operationId"]))
        return tuple(result)

    def _require_predicates(
        self,
        predicates: list[JsonObject],
        error_code: str,
        operation_id: str | None = None,
        *,
        defer_unresolved: bool = False,
    ) -> None:
        for predicate in predicates:
            if defer_unresolved and any(
                operation_id not in self.completed_operations
                for operation_id in self._predicate_operation_ids(predicate)
            ):
                continue
            try:
                passed = self._predicate(predicate)
            except KeyError:
                if defer_unresolved:
                    continue
                raise _ReplayAbort(error_code, operation_id) from None
            if not passed:
                raise _ReplayAbort(error_code, operation_id)

    def _preflight_guards(self) -> None:
        self._require_predicates(
            cast("list[JsonObject]", self.flow["guards"]),
            "guard-failed",
            defer_unresolved=True,
        )
        for operation_id in self._reachable_operation_ids():
            operation = self.operations[operation_id]
            if operation["enabled"] is True or self.simulate_disabled:
                self._require_predicates(
                    cast("list[JsonObject]", operation["guards"]),
                    "guard-failed",
                    operation_id,
                    defer_unresolved=True,
                )

    def _reachable_operation_ids(self) -> tuple[str, ...]:
        ordered: list[str] = []
        seen_operations: set[str] = set()
        seen_recoveries: set[str] = set()

        def visit_operation(operation_id: str) -> None:
            if operation_id in seen_operations:
                return
            seen_operations.add(operation_id)
            ordered.append(operation_id)
            operation = self.operations[operation_id]
            for edge in [
                *cast("list[JsonObject]", operation["failureEdges"]),
                *cast("list[JsonObject]", operation["engineFailureEdges"]),
            ]:
                recovery_id = edge.get("recoveryId")
                if isinstance(recovery_id, str):
                    visit_recovery(recovery_id)

        def visit_recovery(recovery_id: str) -> None:
            if recovery_id in seen_recoveries:
                return
            seen_recoveries.add(recovery_id)
            for reference in cast("list[JsonObject]", self.recoveries[recovery_id]["steps"]):
                visit_operation(cast("str", reference["operationId"]))

        for reference in cast("list[JsonObject]", self.flow["steps"]):
            visit_operation(cast("str", reference["operationId"]))
        return tuple(ordered)

    def _confirm(self) -> None:
        for index, reference in enumerate(cast("list[JsonObject]", self.flow["confirmations"])):
            confirmation_id = cast("str", reference["confirmationId"])
            supplied = self.inputs.get(confirmation_id) or self.inputs.get(f"confirmation{index}")
            accepted = (
                supplied is not None and supplied.type == "boolean" and supplied.value is True
            )
            self.transcript.append(
                {
                    "kind": "confirmation",
                    "confirmationId": confirmation_id,
                    "accepted": accepted,
                }
            )
            if not accepted:
                raise _ReplayAbort("confirmation-declined")

    def _validated_outputs(
        self,
        operation_id: str,
        variant: JsonObject,
        response: JsonObject,
    ) -> list[JsonObject]:
        values = cast("list[JsonObject]", response["outputs"])
        by_name = {cast("str", value["name"]): value for value in values}
        if len(by_name) != len(values):
            raise _ReplayAbort("replay-mismatch", operation_id)
        ports = {
            cast("str", port["name"]): port for port in cast("list[JsonObject]", variant["outputs"])
        }
        if set(by_name) - set(ports):
            raise _ReplayAbort("replay-mismatch", operation_id)
        for name, port in ports.items():
            if port["required"] is True and name not in by_name:
                raise _ReplayAbort("replay-mismatch", operation_id)
        normalized: list[JsonObject] = []
        for port in cast("list[JsonObject]", variant["outputs"]):
            name = cast("str", port["name"])
            if name not in by_name:
                continue
            value = by_name[name]
            if value["type"] != port["type"]:
                raise _ReplayAbort("replay-mismatch", operation_id)
            if validate_typed_value(value, path=f"responses.{operation_id}.{name}"):
                raise _ReplayAbort("replay-mismatch", operation_id)
            typed = TypedValue(
                cast("str", value["type"]),
                cast("str | int | bool | list[str] | None", value["value"]),
            )
            if self._has_sensitive_inputs(variant) and isinstance(typed.value, str):
                self.secrets.add(typed.value)
                self.transcript.add_secret(typed.value)
            self.outputs[(operation_id, name)] = typed
            normalized.append({"name": name, "type": typed.type, "value": typed.value})
        return normalized

    def _record_state_effect(
        self,
        operation_id: str,
        variant: JsonObject,
    ) -> None:
        self.state_effects.append(
            {
                "operationId": operation_id,
                "stateEffect": variant["stateEffect"],
                "outputs": [
                    {
                        "name": name,
                        "type": typed.type,
                        "value": typed.value,
                    }
                    for (source, name), typed in sorted(self.outputs.items())
                    if source == operation_id
                ],
            }
        )

    def _apply_transition(self, operation_id: str, operation: JsonObject) -> None:
        reference = operation["toState"]
        if not isinstance(reference, dict):
            return
        next_state = cast("str", reference["stateId"])
        self.states[next_state] = True
        if next_state != self.current_state:
            previous = self.current_state
            self.current_state = next_state
            self.transcript.append(
                {
                    "kind": "state-transition",
                    "fromStateId": previous,
                    "toStateId": next_state,
                    "operationId": operation_id,
                }
            )

    def _failure_recovery(
        self,
        operation: JsonObject,
        failure_class: str,
        *,
        engine_failure: bool = False,
    ) -> str | None:
        field = "engineFailureEdges" if engine_failure else "failureEdges"
        matches = [
            edge
            for edge in cast("list[JsonObject]", operation[field])
            if edge["failureClass"] == failure_class
        ]
        if len(matches) != 1:
            raise _ReplayAbort("replay-mismatch", cast("str", operation["id"]))
        recovery_id = matches[0].get("recoveryId")
        return recovery_id if isinstance(recovery_id, str) else None

    def _duration(self, operation_id: str) -> int:
        try:
            return self.durations[operation_id]
        except KeyError:
            raise _ReplayAbort("replay-mismatch", operation_id) from None

    def _recover_or_stop(
        self,
        operation: JsonObject,
        failure_class: str,
        *,
        engine_failure: bool = False,
    ) -> None:
        recovery_id = self._failure_recovery(
            operation,
            failure_class,
            engine_failure=engine_failure,
        )
        if recovery_id is not None:
            self._run_recovery(recovery_id, failure_class)

    def _execute_operation(self, operation_id: str) -> None:
        operation = self.operations[operation_id]
        variant = self.variants[cast("str", operation["variant"])]
        allowed_states = {
            cast("str", reference["stateId"])
            for reference in cast("list[JsonObject]", operation["fromStates"])
        }
        if not any(self.states[state_id] for state_id in allowed_states):
            raise _ReplayAbort("guard-failed", operation_id)
        self._require_predicates(
            cast("list[JsonObject]", operation["guards"]),
            "guard-failed",
            operation_id,
        )
        enabled = operation["enabled"] is True
        if not enabled and not self.simulate_disabled:
            return
        duration = self._duration(operation_id)
        before_payload: JsonObject = (
            {
                "kind": "operation-start",
                "operationId": operation_id,
                "variant": operation["variant"],
            }
            if enabled
            else {
                "kind": "operation-would-execute",
                "operationId": operation_id,
                "variant": operation["variant"],
                "durationMs": duration,
            }
        )
        self.transcript.append(before_payload)
        response = self.backend.operation_response(operation_id)
        if response["kind"] == "failure":
            failure_class = cast("str", response["failureClass"])
            if failure_class not in cast("list[str]", variant["failureClasses"]):
                raise _ReplayAbort("replay-mismatch", operation_id)
            self.transcript.append(
                {
                    "kind": "operation-failure",
                    "operationId": operation_id,
                    "failureClass": failure_class,
                    "durationMs": duration,
                }
            )
            self._recover_or_stop(operation, failure_class)
            raise _ReplayAbort(failure_class, operation_id)
        outputs = self._validated_outputs(operation_id, variant, response)
        self._record_state_effect(operation_id, variant)
        try:
            self._require_predicates(
                cast("list[JsonObject]", operation["postconditions"]),
                "postcondition-failed",
                operation_id,
            )
        except _ReplayAbort:
            failure_class = "postcondition-failed"
            self.transcript.append(
                {
                    "kind": "operation-failure",
                    "operationId": operation_id,
                    "failureClass": failure_class,
                    "durationMs": duration,
                }
            )
            self._recover_or_stop(operation, failure_class, engine_failure=True)
            raise
        if self.backend.consume_interruption(operation_id):
            failure_class = "interrupted"
            self.transcript.append(
                {
                    "kind": "operation-failure",
                    "operationId": operation_id,
                    "failureClass": failure_class,
                    "durationMs": duration,
                }
            )
            self._recover_or_stop(operation, failure_class, engine_failure=True)
            raise _ReplayAbort(failure_class, operation_id)
        self._apply_transition(operation_id, operation)
        self.transcript.append(
            {
                "kind": "operation-success",
                "operationId": operation_id,
                "outputs": outputs,
                "durationMs": duration,
            }
        )
        self.completed_operations.add(operation_id)

    def _run_recovery(self, recovery_id: str, trigger: str) -> None:
        if recovery_id in self._active_recoveries:
            raise _ReplayAbort("replay-mismatch")
        self._active_recoveries.add(recovery_id)
        recovery = self.recoveries[recovery_id]
        allowed_states = {
            cast("str", reference["stateId"])
            for reference in cast("list[JsonObject]", recovery["fromStates"])
        }
        if not any(self.states[state_id] for state_id in allowed_states):
            self._active_recoveries.remove(recovery_id)
            raise _ReplayAbort("replay-mismatch")
        self.transcript.append(
            {"kind": "recovery-start", "recoveryId": recovery_id, "trigger": trigger}
        )
        try:
            steps = cast("list[JsonObject]", recovery["steps"])
            for reference in steps:
                operation_id = cast("str", reference["operationId"])
                operation = self.operations[operation_id]
                if operation["enabled"] is not True and not self.simulate_disabled:
                    continue
                self._execute_operation(operation_id)
            terminal = cast("str", cast("JsonObject", recovery["terminalState"])["stateId"])
            if terminal != self.current_state:
                previous = self.current_state
                self.transcript.append(
                    {
                        "kind": "state-transition",
                        "fromStateId": previous,
                        "toStateId": terminal,
                        "operationId": steps[-1]["operationId"],
                    }
                )
            self.current_state = terminal
            self.states[terminal] = True
        finally:
            self._active_recoveries.remove(recovery_id)

    def run(self) -> tuple[str, str | None]:
        self.transcript.append(
            {
                "kind": "session-start",
                "procedureId": self.procedure["id"],
                "flowId": self.flow["id"],
            }
        )
        error_code: str | None = None
        try:
            self._preflight_guards()
            plan = plan_procedure(
                self.procedure,
                flow_id=cast("str", self.flow["id"]),
                adapter_capabilities=set(cast("list[str]", self.scenario["adapterCapabilities"])),
                registry=self.registry,
                simulate_disabled=self.simulate_disabled,
            )
            if plan.missing_capabilities:
                raise _ReplayAbort("capability-missing")
            will_execute = any(step.would_execute for step in plan.steps)
            if will_execute:
                self._confirm()
            for reference in cast("list[JsonObject]", self.flow["steps"]):
                operation_id = cast("str", reference["operationId"])
                operation = self.operations[operation_id]
                if operation["enabled"] is not True and not self.simulate_disabled:
                    continue
                self._execute_operation(operation_id)
                self._require_predicates(
                    cast("list[JsonObject]", self.flow["guards"]),
                    "guard-failed",
                    defer_unresolved=True,
                )
            if will_execute:
                self._require_predicates(
                    cast("list[JsonObject]", self.flow["guards"]),
                    "guard-failed",
                )
            if not self.backend.exhausted:
                raise _ReplayAbort("replay-mismatch")
        except _ReplayAbort as error:
            error_code = error.error_code
        self.transcript.append(
            {
                "kind": "session-end",
                "terminalStateId": self.current_state,
                "errorCode": error_code,
            }
        )
        return self.current_state, error_code


def _validate_scenario_semantics(
    procedure: JsonObject,
    scenario: JsonObject,
    registry: JsonObject,
) -> None:
    issues = validate_procedure_graph(procedure, registry)
    if issues:
        raise RecipeInvalidError("; ".join(issue.render() for issue in issues))

    value_types = set(cast("list[str]", registry["valueTypes"]))
    inputs = cast("list[JsonObject]", scenario["inputs"])
    inputs_by_name: dict[str, JsonObject] = {}
    errors: list[str] = []
    for index, value in enumerate(inputs):
        name = cast("str", value["name"])
        if name in inputs_by_name:
            errors.append(f"inputs.{index}.name: duplicate typed value name: {name!r}")
        else:
            inputs_by_name[name] = value
        if value["type"] not in value_types:
            errors.append(f"inputs.{index}.type: unknown value type: {value['type']!r}")
        errors.extend(
            issue.render() for issue in validate_typed_value(value, path=f"inputs.{index}")
        )

    for runtime_input in cast("list[JsonObject]", procedure["runtimeInputs"]):
        input_id = cast("str", runtime_input["id"])
        supplied = inputs_by_name.get(input_id)
        if supplied is None:
            if runtime_input["required"] is True:
                errors.append(f"inputs: missing required runtime input: {input_id!r}")
            continue
        if supplied["type"] != runtime_input["type"]:
            errors.append(
                f"inputs.{input_id}: expected type {runtime_input['type']!r}, "
                f"got {supplied['type']!r}"
            )

    operations = {
        cast("str", operation["id"]): operation
        for operation in cast("list[JsonObject]", procedure["operations"])
    }
    durations: set[str] = set()
    for index, item in enumerate(cast("list[JsonObject]", scenario["operationDurations"])):
        operation_id = cast("str", item["operationId"])
        if operation_id in durations:
            errors.append(
                f"operationDurations.{index}.operationId: duplicate operation ID: {operation_id!r}"
            )
        durations.add(operation_id)
        if operation_id not in operations:
            errors.append(
                f"operationDurations.{index}.operationId: unknown operation: {operation_id!r}"
            )
    for index, response in enumerate(cast("list[JsonObject]", scenario["responses"])):
        if response["kind"] == "interruption":
            operation_id = cast("str", response["afterOperationId"])
        else:
            operation_id = cast("str", response["operationId"])
            if response["kind"] == "success":
                for output_index, output in enumerate(
                    cast("list[JsonObject]", response["outputs"])
                ):
                    if output["type"] not in value_types:
                        errors.append(
                            f"responses.{index}.outputs.{output_index}.type: "
                            f"unknown value type: {output['type']!r}"
                        )
                    errors.extend(
                        issue.render()
                        for issue in validate_typed_value(
                            output,
                            path=f"responses.{index}.outputs.{output_index}",
                        )
                    )
        if operation_id not in operations:
            errors.append(f"responses.{index}: unknown operation: {operation_id!r}")
        if operation_id not in durations:
            errors.append(f"operationDurations: missing duration for {operation_id!r}")
    if errors:
        raise RecipeInvalidError("; ".join(errors))


def replay_scenario(
    procedure: JsonObject,
    scenario: JsonObject,
    *,
    registry: JsonObject | None = None,
) -> ReplayResult:
    """Replay one validated scenario without subprocess, USB, fetch, or filesystem I/O."""
    scenario_issues = validate_v1_document(
        scenario,
        "org.mura.flash.replay-scenario/v1",
    )
    if scenario_issues:
        raise RecipeInvalidError("; ".join(issue.render() for issue in scenario_issues))
    if scenario["procedureId"] != procedure.get("id"):
        raise RecipeInvalidError("scenario procedureId does not match procedure")
    selected_registry = registry or load_operation_registry()
    _validate_scenario_semantics(procedure, scenario, selected_registry)
    plan = plan_procedure(
        procedure,
        flow_id=cast("str", scenario["flowId"]),
        adapter_capabilities=set(cast("list[str]", scenario["adapterCapabilities"])),
        registry=selected_registry,
        simulate_disabled=cast("bool", scenario["simulateDisabled"]),
    )
    engine = _ReplayEngine(procedure, scenario, selected_registry)
    terminal_state, error_code = engine.run()
    expected = cast("JsonObject", scenario["expected"])
    event_kinds = [
        cast("str", cast("JsonObject", event["payload"])["kind"])
        for event in engine.transcript.events
    ]
    mismatches: list[str] = []
    if terminal_state != expected["terminalStateId"]:
        mismatches.append("terminalStateId")
    if event_kinds != expected["eventKinds"]:
        mismatches.append("eventKinds")
    if error_code != expected["errorCode"]:
        mismatches.append("errorCode")
    return ReplayResult(
        scenario_id=cast("str", scenario["id"]),
        procedure_id=cast("str", procedure["id"]),
        flow_id=cast("str", scenario["flowId"]),
        terminal_state_id=terminal_state,
        error_code=error_code,
        matched_expected=not mismatches,
        mismatches=tuple(mismatches),
        plan=plan,
        events=engine.transcript.events,
        state_effects=tuple(
            cast("list[JsonObject]", redact_json(engine.state_effects, engine.secrets))
        ),
    )
