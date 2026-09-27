#!/usr/bin/env python3
"""Validate v0/v1 data contracts and generate deterministic catalogs.

This tool intentionally uses only the Python standard library. Validation
fails closed on duplicate keys, schema drift, unresolved references, invalid
operation graphs, stale generated output, and enabled destructive operations.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, NoReturn
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "v0.json"
CONTRACT_SCHEMA_PATH = ROOT / "contracts" / "v0.schema.json"
RECIPE_SCHEMA_PATH = ROOT / "recipes" / "inspection-recipe-v1.schema.json"
TARGETS_DIR = ROOT / "recipes" / "targets"
INDEX_PATH = ROOT / "recipes" / "index.json"
DIGEST_PATH = ROOT / "contracts" / "v0.sha256"
V1_CONTRACT_PATH = ROOT / "contracts" / "v1.json"
V1_CONTRACT_SCHEMA_PATH = ROOT / "contracts" / "v1.schema.json"
PROCEDURE_REGISTRY_PATH = ROOT / "contracts" / "procedure-v1.json"
PROCEDURE_REGISTRY_SCHEMA_PATH = ROOT / "contracts" / "procedure-v1.schema.json"
IMMUTABILITY_PATH = ROOT / "contracts" / "v0-immutability.json"
TARGET_RECORD_SCHEMA_PATH = ROOT / "catalog" / "target-record-v1.schema.json"
V1_TARGETS_DIR = ROOT / "catalog" / "targets"
V1_INDEX_PATH = ROOT / "catalog" / "index-v1.json"
V1_DIGEST_PATH = ROOT / "contracts" / "v1.sha256"
PROCEDURE_SCHEMA_PATH = ROOT / "recipes" / "install-procedure-v1.schema.json"
PROCEDURES_DIR = ROOT / "recipes" / "procedures"
V1_FIXTURE_ROOT = ROOT / "tests" / "fixtures" / "schema-or-catalog"
V1_FIXTURE_MANIFEST = V1_FIXTURE_ROOT / "manifest.json"
SOURCE_PARITY_ROOT = ROOT / "tests" / "fixtures" / "source-parity"
SAMSUNG_EVIDENCE_ROOT = ROOT / "evidence" / "samsung"
SAMSUNG_EVIDENCE_MANIFEST = SAMSUNG_EVIDENCE_ROOT / "manifest.json"
SAMSUNG_SCENARIO_ROOT = ROOT / "replay" / "scenarios" / "samsung"
ENGINE_FAILURE_CLASSES = frozenset({"postcondition-failed", "interrupted"})
REFERENCE_VALUE_TYPES = frozenset(
    {"artifact-ref", "partition-ref", "backup-ref", "state-ref", "device-ref"}
)

DESTRUCTIVE_SAFETY_CLASSES = frozenset({"device-write", "device-erase", "security-state-change"})
EXPECTED_PROCEDURES = {
    "htc-vive-xr-elite-kyoto": ["htc-vive-xr-elite-10999738-unlock"],
    "lynx-r1": ["lynx-r1-qdl-stock-restore", "lynx-r1-versioned-sideload"],
    "oculus-go-pacific": ["oculus-go-pacific-official-unlock"],
    "pico-4-phoenix": ["pico-4-phoenix-unlock"],
    "pico-4-pro-phoenix": ["pico-4-pro-phoenix-unlock"],
    "pico-neo-3": ["pico-neo-3-unlock"],
    "quest-1-monterey": [
        "quest-1-monterey-inactive-slot-unlock",
        "quest-1-monterey-v29-direct-unlock",
    ],
    "quest-2-hollywood": [
        "quest-2-hollywood-50670960048600150-inactive-slot-unlock",
        "quest-2-hollywood-v29-direct-unlock",
    ],
    "samsung-galaxy-xr-sm-i610": ["samsung-galaxy-xr-ayke-to-ayia-rollback-unlock"],
}
EXPECTED_SAMSUNG_EVIDENCE = {
    "ayia-community-report.json",
    "launch-unlock-media.json",
    "official-build-ledger.json",
    "wall-of-shame-claims.json",
}
EXPECTED_SAMSUNG_SCENARIOS = {
    "samsung-ayia-direct-unlock-success",
    "samsung-ayia-wrong-build-guard",
    "samsung-ayke-rollback-unverified",
    "samsung-download-entry-unresolved",
    "samsung-download-observation-blocked",
    "samsung-oem-unlock-absent",
    "samsung-normal-disabled-plan",
    "samsung-post-reboot-lock-state-mismatch",
    "samsung-safe-stop-model-transport-failure",
    "samsung-simulation-only-unqualified-package-hash-failure",
    "samsung-simulation-only-unqualified-package-member-failure",
    "samsung-simulation-only-unqualified-package-unavailable",
    "samsung-simulation-only-unqualified-write-failure",
    "samsung-simulation-only-unqualified-write-interruption",
    "samsung-u2-rollback-refusal",
    "samsung-unlock-declined",
    "samsung-unlock-reconnect-failure",
    "samsung-unlock-wipe-interruption",
    "samsung-unlocked-warning-not-observed",
    "samsung-unknown-build-refusal",
}
EXPECTED_BUILD_EVIDENCE = {
    "quest-pro-cambria": ["51483620027600340"],
    "quest-3s-panther": ["3814840024700610", "836890024401570"],
}
IMMUTABLE_V0_PATHS = (
    "contracts/v0.json",
    "contracts/v0.schema.json",
    "recipes/inspection-recipe-v1.schema.json",
)

PUBLIC_ERROR = "recipe-invalid"
FORBIDDEN_COMMAND_FIELDS = frozenset(
    {"argv", "command", "commands", "executable", "script", "shell"}
)
FORBIDDEN_STATE_FIELDS = frozenset(
    {
        "artifacts",
        "erase",
        "flash",
        "operations",
        "partitions",
        "reboot",
        "setActiveSlot",
        "transition",
        "transitions",
        "unlock",
        "write",
        "writes",
    }
)


class ValidationFailure(Exception):
    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


class DuplicateKey(ValueError):
    pass


def fail(reason: str, message: str) -> NoReturn:
    raise ValidationFailure(reason, message)


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKey(key)
        result[key] = value
    return result


def load_json(path: Path) -> Any:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        fail("json-read", f"{path}: {error}")
    try:
        return json.loads(
            text,
            object_pairs_hook=_unique_object,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"non-finite number {value}")
            ),
        )
    except DuplicateKey as error:
        fail("duplicate-key", f"{path}: duplicate object key {error.args[0]!r}")
    except (json.JSONDecodeError, ValueError) as error:
        fail("malformed-json", f"{path}: {error}")


def _json_type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return (
            isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
        )
    if expected == "null":
        return value is None
    return False


def _resolve_ref(root_schema: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/"):
        fail("schema-definition", f"unsupported non-local schema reference {ref!r}")
    value: Any = root_schema
    for component in ref[2:].split("/"):
        component = component.replace("~1", "/").replace("~0", "~")
        if not isinstance(value, dict) or component not in value:
            fail("schema-definition", f"unresolved schema reference {ref!r}")
        value = value[component]
    if not isinstance(value, dict):
        fail("schema-definition", f"schema reference {ref!r} is not an object")
    return value


def validate_schema(
    value: Any,
    schema: dict[str, Any],
    root_schema: dict[str, Any],
    location: str = "$",
) -> None:
    if "$ref" in schema:
        validate_schema(value, _resolve_ref(root_schema, schema["$ref"]), root_schema, location)
        return

    for index, branch in enumerate(schema.get("allOf", [])):
        validate_schema(value, branch, root_schema, f"{location}<allOf:{index}>")

    if "oneOf" in schema:
        matches = 0
        for branch in schema["oneOf"]:
            try:
                validate_schema(value, branch, root_schema, location)
            except ValidationFailure:
                continue
            matches += 1
        if matches != 1:
            fail(
                "schema-one-of",
                f"{location}: expected exactly one matching branch, got {matches}",
            )

    if "anyOf" in schema:
        for branch in schema["anyOf"]:
            try:
                validate_schema(value, branch, root_schema, location)
                break
            except ValidationFailure:
                continue
        else:
            fail("schema-any-of", f"{location}: no branch matched")

    if "not" in schema:
        try:
            validate_schema(value, schema["not"], root_schema, location)
        except ValidationFailure:
            pass
        else:
            fail("schema-not", f"{location}: prohibited schema matched")

    if "if" in schema:
        try:
            validate_schema(value, schema["if"], root_schema, location)
        except ValidationFailure:
            conditional = schema.get("else")
        else:
            conditional = schema.get("then")
        if isinstance(conditional, dict):
            validate_schema(value, conditional, root_schema, location)

    if "const" in schema and value != schema["const"]:
        fail("schema-const", f"{location}: expected constant {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        fail("schema-enum", f"{location}: value {value!r} is not allowed")

    expected_type = schema.get("type")
    if expected_type is not None and not _json_type_matches(value, expected_type):
        fail("schema-type", f"{location}: expected {expected_type}")

    if isinstance(value, dict):
        required = schema.get("required", [])
        for name in required:
            if name not in value:
                fail("schema-required", f"{location}: missing required field {name!r}")

        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        for name, child in value.items():
            child_location = f"{location}.{name}"
            if name in properties:
                validate_schema(child, properties[name], root_schema, child_location)
            elif additional is False:
                fail("unknown-field", f"{child_location}: field is not allowed")
            elif isinstance(additional, dict):
                validate_schema(child, additional, root_schema, child_location)

        if len(value) < schema.get("minProperties", 0):
            fail("schema-min-properties", f"{location}: too few properties")
        if "maxProperties" in schema and len(value) > schema["maxProperties"]:
            fail("schema-max-properties", f"{location}: too many properties")

    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            fail("schema-min-items", f"{location}: too few items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            fail("schema-max-items", f"{location}: too many items")
        if schema.get("uniqueItems"):
            seen: set[str] = set()
            for index, item in enumerate(value):
                encoded = json.dumps(
                    item, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":")
                )
                if encoded in seen:
                    fail("schema-unique", f"{location}[{index}]: duplicate item")
                seen.add(encoded)
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                validate_schema(item, item_schema, root_schema, f"{location}[{index}]")

    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            fail("schema-min-length", f"{location}: string is too short")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            fail("schema-max-length", f"{location}: string is too long")
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            fail("schema-pattern", f"{location}: string does not match {schema['pattern']!r}")
        if schema.get("format") == "uri":
            parsed = urlparse(value)
            if not parsed.scheme or (parsed.scheme in {"http", "https"} and not parsed.netloc):
                fail("schema-uri", f"{location}: invalid URI")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            fail("schema-minimum", f"{location}: value is below minimum")
        if "maximum" in schema and value > schema["maximum"]:
            fail("schema-maximum", f"{location}: value is above maximum")


def _walk_fields(value: Any, location: str = "$") -> list[tuple[str, str]]:
    fields: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_location = f"{location}.{key}"
            fields.append((key, child_location))
            fields.extend(_walk_fields(child, child_location))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            fields.extend(_walk_fields(child, f"{location}[{index}]"))
    return fields


def check_hard_safety(recipe: Any, path: Path) -> None:
    if not isinstance(recipe, dict):
        fail("schema-type", f"{path}: recipe must be an object")
    if recipe.get("schema") != "org.mura.flash.inspection-recipe/v1":
        fail("safety-schema", f"{path}: recipe schema is not inspection-only v1")
    if recipe.get("authenticationStatus") != "test-only":
        fail("safety-authentication", f"{path}: authenticationStatus must be test-only")
    if recipe.get("writesEnabled") is not False:
        fail("safety-writes", f"{path}: writesEnabled must be false")

    for field, location in _walk_fields(recipe):
        if field in FORBIDDEN_COMMAND_FIELDS:
            fail("safety-command-field", f"{path}: forbidden executable field at {location}")
        if field in FORBIDDEN_STATE_FIELDS:
            fail("safety-state-field", f"{path}: forbidden transition/write field at {location}")


def load_contract() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    contract_schema = load_json(CONTRACT_SCHEMA_PATH)
    recipe_schema = load_json(RECIPE_SCHEMA_PATH)
    contract = load_json(CONTRACT_PATH)
    if not isinstance(contract_schema, dict) or not isinstance(recipe_schema, dict):
        fail("schema-definition", "schema document must be an object")
    validate_schema(contract, contract_schema, contract_schema)

    probe_ids = [probe["id"] for probe in contract["probeIds"]]
    if len(probe_ids) != len(set(probe_ids)):
        fail("contract-probe-id", f"{CONTRACT_PATH}: duplicate probe id")
    facts = [probe["fact"] for probe in contract["probeIds"]]
    if len(facts) != len(set(facts)):
        fail("contract-fact-id", f"{CONTRACT_PATH}: duplicate fact id")
    return contract, contract_schema, recipe_schema


def validate_recipe(
    recipe: Any,
    path: Path,
    contract: dict[str, Any],
    recipe_schema: dict[str, Any],
) -> dict[str, Any]:
    check_hard_safety(recipe, path)
    validate_schema(recipe, recipe_schema, recipe_schema)
    assert isinstance(recipe, dict)

    target_ids = set(contract["targetIds"])
    if recipe["id"] not in target_ids:
        fail("unknown-target", f"{path}: unknown target id {recipe['id']!r}")

    probes = {probe["id"]: probe for probe in contract["probeIds"]}
    selected_facts: set[str] = set()
    for probe_id in recipe["probes"]:
        if probe_id not in probes:
            fail("unknown-probe", f"{path}: unknown probe id {probe_id!r}")
        probe = probes[probe_id]
        if probe["transport"] not in recipe["transports"]:
            fail(
                "probe-transport",
                f"{path}: probe {probe_id!r} requires transport {probe['transport']!r}",
            )
        selected_facts.add(probe["fact"])

    facts = {probe["fact"] for probe in contract["probeIds"]}
    for fact in recipe["redactFacts"]:
        if fact not in facts:
            fail("unknown-redact-fact", f"{path}: unknown redaction fact {fact!r}")
        if fact not in selected_facts:
            fail("unselected-redact-fact", f"{path}: redaction fact {fact!r} is not selected")
    for probe_id in recipe["probes"]:
        probe = probes[probe_id]
        if probe.get("sensitive") and probe["fact"] not in recipe["redactFacts"]:
            fail(
                "sensitive-fact-not-redacted",
                f"{path}: sensitive probe {probe_id!r} requires redaction of {probe['fact']!r}",
            )
    return recipe


def load_catalog(contract: dict[str, Any], recipe_schema: dict[str, Any]) -> list[dict[str, Any]]:
    recipes: list[dict[str, Any]] = []
    seen: set[str] = set()
    for path in sorted(TARGETS_DIR.glob("*.json")):
        recipe = validate_recipe(load_json(path), path, contract, recipe_schema)
        recipe_id = recipe["id"]
        if path.stem != recipe_id:
            fail("filename-id-mismatch", f"{path}: filename must be {recipe_id}.json")
        if recipe_id in seen:
            fail("duplicate-target", f"{path}: duplicate recipe id {recipe_id!r}")
        seen.add(recipe_id)
        recipes.append(recipe)

    expected = set(contract["targetIds"])
    missing = sorted(expected - seen)
    extra = sorted(seen - expected)
    if missing or extra:
        fail("target-set", f"recipe target set mismatch; missing={missing}, extra={extra}")
    recipes.sort(key=lambda recipe: recipe["id"])
    return recipes


def _ids(items: list[dict[str, Any]], kind: str, path: Path) -> set[str]:
    values = [item["id"] for item in items]
    if len(values) != len(set(values)):
        fail("duplicate-id", f"{path}: duplicate {kind} id")
    return set(values)


def check_self_contained_schema(path: Path, schema: Any) -> dict[str, Any]:
    if not isinstance(schema, dict):
        fail("schema-definition", f"{path}: schema must be an object")
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        fail("schema-draft", f"{path}: schema must declare Draft 2020-12")

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            ref = value.get("$ref")
            if ref is not None:
                if not isinstance(ref, str) or not ref.startswith("#/"):
                    fail("schema-external-ref", f"{path}: schema reference {ref!r} is not local")
                _resolve_ref(schema, ref)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(schema)
    return schema


def validate_source_citations(value: Any, document_path: Path) -> None:
    if isinstance(value, dict):
        citations = value.get("sourceCitations")
        if isinstance(citations, list):
            for citation in citations:
                if not isinstance(citation, dict):
                    continue
                if citation.get("kind") == "pinned-external":
                    uri = citation.get("uri")
                    commit = citation.get("commit")
                    path = citation.get("path")
                    start = citation.get("lineStart")
                    end = citation.get("lineEnd")
                    if (
                        not isinstance(uri, str)
                        or not isinstance(commit, str)
                        or re.fullmatch(r"[0-9a-f]{40}", commit) is None
                        or f"/blob/{commit}/" not in uri
                        or not isinstance(path, str)
                        or uri.split(f"/blob/{commit}/", 1)[1] != path
                        or not isinstance(start, int)
                        or not isinstance(end, int)
                        or start > end
                    ):
                        fail(
                            "citation-invalid",
                            f"{document_path}: malformed immutable pinned citation",
                        )
                    continue
                if citation.get("kind") != "repository":
                    continue
                relative = citation.get("path")
                start = citation.get("lineStart")
                end = citation.get("lineEnd")
                if (
                    not isinstance(relative, str)
                    or not isinstance(start, int)
                    or not isinstance(end, int)
                ):
                    fail("citation-invalid", f"{document_path}: malformed repository citation")
                if relative.startswith("/") or ".." in Path(relative).parts:
                    fail(
                        "citation-path",
                        f"{document_path}: repository citation must remain inside mura-flash",
                    )
                cited_path = (ROOT / relative).resolve()
                try:
                    cited_path.relative_to(ROOT.resolve())
                except ValueError:
                    fail(
                        "citation-path",
                        f"{document_path}: citation escapes mura-flash: {relative}",
                    )
                try:
                    line_count = len(cited_path.read_text(encoding="utf-8").splitlines())
                except (OSError, UnicodeError) as error:
                    fail("citation-read", f"{document_path}: cannot read {relative}: {error}")
                if start > end or end > line_count:
                    fail(
                        "citation-range",
                        f"{document_path}: invalid citation {relative}:{start}-{end} "
                        f"(file has {line_count} lines)",
                    )
        for child in value.values():
            validate_source_citations(child, document_path)
    elif isinstance(value, list):
        for child in value:
            validate_source_citations(child, document_path)


def validate_hermetic_citation_objects(value: Any, document_path: Path) -> None:
    if isinstance(value, str):
        if value.startswith("../mura"):
            fail(
                "citation-path",
                f"{document_path}: cross-repository filesystem citation is prohibited",
            )
        return
    if isinstance(value, dict):
        if value.get("kind") == "pinned-external":
            uri = value.get("uri")
            commit = value.get("commit")
            relative = value.get("path")
            start = value.get("lineStart")
            end = value.get("lineEnd")
            if (
                not isinstance(uri, str)
                or not isinstance(commit, str)
                or re.fullmatch(r"[0-9a-f]{40}", commit) is None
                or f"/blob/{commit}/" not in uri
                or not isinstance(relative, str)
                or uri.split(f"/blob/{commit}/", 1)[1] != relative
                or not isinstance(start, int)
                or not isinstance(end, int)
                or start > end
            ):
                fail("citation-invalid", f"{document_path}: malformed pinned citation")
        for child in value.values():
            validate_hermetic_citation_objects(child, document_path)
    elif isinstance(value, list):
        for child in value:
            validate_hermetic_citation_objects(child, document_path)


def validate_registry(
    registry: dict[str, Any], contract: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    operation_ids = _ids(registry["operations"], "operation", PROCEDURE_REGISTRY_PATH)
    del operation_ids
    value_types = set(registry["valueTypes"])
    safety_classes = set(registry["safetyClasses"])
    failure_classes = set(contract["errorCodes"])
    operations: dict[str, dict[str, Any]] = {}

    for operation in registry["operations"]:
        operation_id = operation["id"]
        if operation["safetyClass"] not in safety_classes:
            fail("registry-safety-class", f"{operation_id}: unknown safety class")
        for direction in ("inputs", "outputs"):
            names = [port["name"] for port in operation[direction]]
            if len(names) != len(set(names)):
                fail("registry-port", f"{operation_id}: duplicate {direction} port")
            for port in operation[direction]:
                if port["type"] not in value_types:
                    fail(
                        "registry-value-type",
                        f"{operation_id}.{port['name']}: unknown value type {port['type']!r}",
                    )
        parameter_names = [item["name"] for item in operation["algorithmParameters"]]
        if len(parameter_names) != len(set(parameter_names)):
            fail("registry-parameter", f"{operation_id}: duplicate algorithm parameter")
        unknown_failures = sorted(set(operation["failureClasses"]) - failure_classes)
        if unknown_failures:
            fail(
                "registry-failure-class",
                f"{operation_id}: failures absent from contract errorCodes: {unknown_failures}",
            )
        operations[operation_id] = operation

    validate_source_citations(registry, PROCEDURE_REGISTRY_PATH)
    return operations


def _reference_id(reference: Any, kind: str, field: str, path: Path) -> str:
    if not isinstance(reference, dict) or reference.get("kind") != kind:
        fail("graph-reference", f"{path}: expected {kind!r} reference")
    value = reference.get(field)
    if not isinstance(value, str):
        fail("graph-reference", f"{path}: malformed {kind!r} reference")
    return value


def _value_type(
    reference: dict[str, Any],
    procedure_operations: dict[str, dict[str, Any]],
    registry: dict[str, dict[str, Any]],
    runtime_inputs: dict[str, str],
    path: Path,
) -> str:
    kind = reference["kind"]
    direct_types = {
        "artifact": "artifact-ref",
        "partition": "partition-ref",
        "backup": "backup-ref",
        "state": "state-ref",
    }
    if kind in direct_types:
        return direct_types[kind]
    if kind == "constant":
        if reference["valueType"] in REFERENCE_VALUE_TYPES:
            fail(
                "graph-constant-reference",
                f"{path}: reference type {reference['valueType']!r} cannot be a constant",
            )
        return reference["valueType"]
    if kind == "runtime-input":
        input_id = reference["inputId"]
        if input_id not in runtime_inputs:
            fail("graph-runtime-input", f"{path}: unknown runtime input {input_id!r}")
        return runtime_inputs[input_id]
    if kind == "operation-output":
        producer_id = reference["operationId"]
        producer = procedure_operations.get(producer_id)
        if producer is None:
            fail("graph-operation-output", f"{path}: unknown producer operation {producer_id!r}")
        definition = registry[producer["variant"]]
        matches = [
            output for output in definition["outputs"] if output["name"] == reference["outputName"]
        ]
        if len(matches) != 1:
            fail(
                "graph-operation-output",
                f"{path}: operation {producer_id!r} has no output {reference['outputName']!r}",
            )
        return matches[0]["type"]
    fail("graph-value-kind", f"{path}: unsupported value reference kind {kind!r}")


def _validate_value_reference(
    reference: dict[str, Any],
    procedure_operations: dict[str, dict[str, Any]],
    registry: dict[str, dict[str, Any]],
    artifacts: set[str],
    partitions: set[str],
    backups: set[str],
    states: dict[str, dict[str, Any]],
    runtime_inputs: dict[str, str],
    path: Path,
) -> str:
    value_type = _value_type(reference, procedure_operations, registry, runtime_inputs, path)
    direct_references = (
        ("artifact", "artifactId", artifacts, "graph-artifact"),
        ("partition", "partitionId", partitions, "graph-partition"),
        ("backup", "backupId", backups, "graph-backup"),
        ("state", "stateId", set(states), "graph-state"),
    )
    for kind, field, known, reason in direct_references:
        if reference["kind"] == kind and reference[field] not in known:
            fail(reason, f"{path}: unknown {kind} {reference[field]!r}")
    return value_type


def validate_procedure(
    procedure: Any,
    path: Path,
    procedure_schema: dict[str, Any],
    registry: dict[str, dict[str, Any]],
    target_ids: set[str],
) -> dict[str, Any]:
    validate_schema(procedure, procedure_schema, procedure_schema)
    assert isinstance(procedure, dict)
    if procedure["targetId"] not in target_ids:
        fail("procedure-target", f"{path}: unknown target {procedure['targetId']!r}")
    if procedure["enabled"] is not False:
        fail("procedure-enabled", f"{path}: unqualified procedure must be disabled")
    if procedure.get("muraPolicy", {}).get("liveDestructiveAllowed") is not False:
        fail("procedure-policy", f"{path}: live destructive operations must not be authorized")

    states = {item["id"]: item for item in procedure["states"]}
    if len(states) != len(procedure["states"]):
        fail("duplicate-id", f"{path}: duplicate state id")
    initial_states = [item["id"] for item in procedure["states"] if item["initial"]]
    initial_by_kind = [
        [item["id"] for item in procedure["states"] if item["kind"] == kind and item["initial"]]
        for kind in {item["kind"] for item in procedure["states"]}
    ]
    if not initial_states or any(len(items) > 1 for items in initial_by_kind):
        fail("graph-initial-state", f"{path}: each state dimension may have one initial state")

    artifacts = _ids(procedure["artifacts"], "artifact", path)
    known_artifact_digests = {
        item["digest"]["sha256"]
        for item in procedure["artifacts"]
        if item["digest"]["kind"] == "known"
    }
    partitions = _ids(procedure["partitions"], "partition", path)
    backups = _ids(procedure["backups"], "backup", path)
    runtime_inputs = {item["id"]: item["type"] for item in procedure["runtimeInputs"]}
    if len(runtime_inputs) != len(procedure["runtimeInputs"]):
        fail("duplicate-id", f"{path}: duplicate runtime input id")
    registry_value_types = {
        port["type"]
        for definition in registry.values()
        for direction in ("inputs", "outputs")
        for port in definition[direction]
    }
    unknown_runtime_types = sorted(set(runtime_inputs.values()) - registry_value_types)
    if unknown_runtime_types:
        fail(
            "graph-runtime-input-type",
            f"{path}: unknown runtime input types {unknown_runtime_types}",
        )
    confirmations = {item["id"]: item for item in procedure["confirmations"]}
    if len(confirmations) != len(procedure["confirmations"]):
        fail("duplicate-id", f"{path}: duplicate confirmation id")
    recoveries = {item["id"]: item for item in procedure["recovery"]}
    if len(recoveries) != len(procedure["recovery"]):
        fail("duplicate-id", f"{path}: duplicate recovery id")
    flows = {item["id"]: item for item in procedure["flows"]}
    if len(flows) != len(procedure["flows"]):
        fail("duplicate-id", f"{path}: duplicate flow id")
    operations = {item["id"]: item for item in procedure["operations"]}
    if len(operations) != len(procedure["operations"]):
        fail("duplicate-id", f"{path}: duplicate procedure operation id")

    for confirmation_id, confirmation in confirmations.items():
        unknown = sorted(
            set(confirmation["safetyClasses"]) - {item["safetyClass"] for item in registry.values()}
        )
        if unknown:
            fail(
                "graph-confirmation",
                f"{path}: confirmation {confirmation_id!r} has unknown safety classes {unknown}",
            )

    for backup in procedure["backups"]:
        partition_id = _reference_id(backup["partition"], "partition", "partitionId", path)
        if partition_id not in partitions:
            fail("graph-backup", f"{path}: backup references unknown partition {partition_id!r}")

    for operation_id, operation in operations.items():
        variant = operation["variant"]
        if variant not in registry:
            fail("registry-operation", f"{path}: unknown operation variant {variant!r}")
        definition = registry[variant]
        if operation["enabled"] is not False:
            fail("procedure-operation-enabled", f"{path}: every v1 operation must be disabled")
        if operation["enabled"] and definition["safetyClass"] in DESTRUCTIVE_SAFETY_CLASSES:
            fail(
                "enabled-destructive-operation",
                f"{path}: {operation_id!r} enables destructive variant {variant!r}",
            )
        arguments = {argument["inputName"]: argument for argument in operation["arguments"]}
        if len(arguments) != len(operation["arguments"]):
            fail("graph-argument", f"{path}: {operation_id!r} has duplicate arguments")
        expected_inputs = {item["name"]: item for item in definition["inputs"]}
        missing = sorted(
            name
            for name, port in expected_inputs.items()
            if port["required"] and name not in arguments
        )
        extra = sorted(set(arguments) - set(expected_inputs))
        if missing or extra:
            fail(
                "graph-argument",
                f"{path}: {operation_id!r} argument mismatch; missing={missing}, extra={extra}",
            )
        for name, argument in arguments.items():
            actual_type = _validate_value_reference(
                argument["value"],
                operations,
                registry,
                artifacts,
                partitions,
                backups,
                states,
                runtime_inputs,
                path,
            )
            if actual_type != expected_inputs[name]["type"]:
                fail(
                    "graph-argument-type",
                    f"{path}: {operation_id!r}.{name} expects {expected_inputs[name]['type']!r}, "
                    f"got {actual_type!r}",
                )
        if variant == "artifact.verify":
            expected = arguments["expectedDigest"]["value"]
            if (
                expected.get("kind") != "constant"
                or expected.get("valueType") != "digest"
                or expected.get("value") not in known_artifact_digests
            ):
                fail(
                    "artifact-digest-unknown",
                    f"{path}: {operation_id!r} requires a declared known artifact digest",
                )
        edge_failures = [edge["failureClass"] for edge in operation["failureEdges"]]
        if len(edge_failures) != len(set(edge_failures)):
            fail("graph-failure-edge", f"{path}: {operation_id!r} has duplicate failure edges")
        if set(edge_failures) != set(definition["failureClasses"]):
            fail(
                "graph-failure-edge",
                f"{path}: {operation_id!r} failure edges must exactly cover registry failures",
            )
        for edge in operation["failureEdges"]:
            if "recoveryId" in edge and edge["recoveryId"] not in recoveries:
                fail(
                    "graph-recovery",
                    f"{path}: {operation_id!r} references unknown recovery {edge['recoveryId']!r}",
                )
        engine_failures = [edge["failureClass"] for edge in operation["engineFailureEdges"]]
        if set(engine_failures) != ENGINE_FAILURE_CLASSES or len(engine_failures) != 2:
            fail(
                "graph-engine-failure",
                f"{path}: {operation_id!r} must declare exact engine failure dispositions",
            )
        for edge in operation["engineFailureEdges"]:
            if "recoveryId" in edge and edge["recoveryId"] not in recoveries:
                fail(
                    "graph-recovery",
                    f"{path}: {operation_id!r} engine failure references unknown recovery",
                )
        from_state_ids = [
            _reference_id(item, "state", "stateId", path) for item in operation["fromStates"]
        ]
        if any(item not in states for item in from_state_ids):
            fail("graph-operation-state", f"{path}: {operation_id!r} has unknown fromStates")
        if operation["toState"] is not None:
            to_state_id = _reference_id(operation["toState"], "state", "stateId", path)
            if to_state_id not in states:
                fail("graph-operation-state", f"{path}: {operation_id!r} has unknown toState")
            if to_state_id in from_state_ids:
                fail(
                    "graph-operation-state",
                    f"{path}: {operation_id!r} cannot transition a state to itself",
                )
        for predicates in (operation["guards"], operation["postconditions"]):
            for predicate in predicates:
                if predicate["kind"] == "state-assertion":
                    state_id = _reference_id(predicate["state"], "state", "stateId", path)
                    if state_id not in states:
                        fail("graph-state-assertion", f"{path}: unknown state {state_id!r}")
                    continue
                if predicate["kind"] == "output-present":
                    _validate_value_reference(
                        predicate["value"],
                        operations,
                        registry,
                        artifacts,
                        partitions,
                        backups,
                        states,
                        runtime_inputs,
                        path,
                    )
                    continue
                for side in ("left", "right"):
                    _validate_value_reference(
                        predicate[side],
                        operations,
                        registry,
                        artifacts,
                        partitions,
                        backups,
                        states,
                        runtime_inputs,
                        path,
                    )
        if operation["toState"] is not None:
            target_id = operation["toState"]["stateId"]
            for predicate in operation["postconditions"]:
                if (
                    predicate["kind"] == "state-assertion"
                    and predicate["state"]["stateId"] == target_id
                    and predicate["expected"]
                ):
                    fail(
                        "graph-self-fulfilling-postcondition",
                        f"{path}: {operation_id!r} asserts its own applied target state",
                    )

    referenced_operations: set[str] = set()
    for flow_id, flow in flows.items():
        state_id = _reference_id(flow["initialState"], "state", "stateId", path)
        if state_id not in states or not states[state_id]["initial"]:
            fail("graph-flow-state", f"{path}: flow {flow_id!r} must start at the initial state")
        for step in flow["steps"]:
            operation_id = _reference_id(step, "operation", "operationId", path)
            if operation_id not in operations:
                fail("graph-flow-operation", f"{path}: unknown operation {operation_id!r}")
            referenced_operations.add(operation_id)
        for confirmation in flow["confirmations"]:
            confirmation_id = _reference_id(confirmation, "confirmation", "confirmationId", path)
            if confirmation_id not in confirmations:
                fail("graph-confirmation", f"{path}: unknown confirmation {confirmation_id!r}")
        for predicate in flow["guards"]:
            if predicate["kind"] == "state-assertion":
                state_id = _reference_id(predicate["state"], "state", "stateId", path)
                if state_id not in states:
                    fail("graph-state-assertion", f"{path}: unknown flow state {state_id!r}")
                continue
            for side in ("left", "right"):
                _validate_value_reference(
                    predicate[side],
                    operations,
                    registry,
                    artifacts,
                    partitions,
                    backups,
                    states,
                    runtime_inputs,
                    path,
                )

    for recovery_id, recovery in recoveries.items():
        for state_ref in recovery["fromStates"]:
            state_id = _reference_id(state_ref, "state", "stateId", path)
            if state_id not in states:
                fail("graph-recovery-state", f"{path}: unknown state {state_id!r}")
        terminal_id = _reference_id(recovery["terminalState"], "state", "stateId", path)
        if terminal_id not in states:
            fail("graph-recovery-state", f"{path}: unknown terminal state {terminal_id!r}")
        for step in recovery["steps"]:
            operation_id = _reference_id(step, "operation", "operationId", path)
            if operation_id not in operations:
                fail(
                    "graph-recovery-operation",
                    f"{path}: recovery {recovery_id!r} references unknown operation",
                )
            referenced_operations.add(operation_id)

    unreferenced = sorted(set(operations) - referenced_operations)
    if unreferenced:
        fail("graph-unreachable-operation", f"{path}: unreferenced operations {unreferenced}")
    validate_source_citations(procedure, path)
    return procedure


def validate_immutability() -> None:
    manifest = load_json(IMMUTABILITY_PATH)
    if (
        not isinstance(manifest, dict)
        or manifest.get("schema") != "org.mura.flash.v0-immutability/v1"
    ):
        fail("v0-immutability", f"{IMMUTABILITY_PATH}: invalid manifest")
    entries = manifest.get("files")
    if not isinstance(entries, list):
        fail("v0-immutability", f"{IMMUTABILITY_PATH}: files must be an array")
    paths = [entry.get("path") for entry in entries if isinstance(entry, dict)]
    if tuple(paths) != IMMUTABLE_V0_PATHS:
        fail("v0-immutability", f"{IMMUTABILITY_PATH}: immutable path set or order changed")
    for entry in entries:
        path = ROOT / entry["path"]
        data = path.read_bytes()
        if len(data) != entry.get("size"):
            fail("v0-immutability", f"{path}: immutable size mismatch")
        if hashlib.sha256(data).hexdigest() != entry.get("sha256"):
            fail("v0-immutability", f"{path}: immutable digest mismatch")


def load_v1_catalog(
    target_schema: dict[str, Any], expected_target_ids: set[str]
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for path in sorted(V1_TARGETS_DIR.glob("*.json")):
        record = load_json(path)
        validate_schema(record, target_schema, target_schema)
        assert isinstance(record, dict)
        record_id = record["id"]
        if path.stem != record_id:
            fail("filename-id-mismatch", f"{path}: filename must be {record_id}.json")
        if record_id in seen:
            fail("duplicate-target", f"{path}: duplicate target id {record_id!r}")
        seen.add(record_id)
        expected = EXPECTED_PROCEDURES.get(record_id)
        availability = record["procedureAvailability"]
        available_ids = sorted(availability.get("procedureIds", []))
        if expected is None:
            if availability["kind"] != "unavailable":
                fail("procedure-availability", f"{path}: target must have no procedure")
        elif availability["kind"] != "available" or available_ids != expected:
            fail(
                "procedure-availability",
                f"{path}: expected procedure ids {expected}",
            )
        validate_source_citations(record, path)
        expected_builds = EXPECTED_BUILD_EVIDENCE.get(record_id)
        if expected_builds is not None:
            actual_builds = [item["buildId"] for item in record.get("buildEvidence", [])]
            if actual_builds != expected_builds:
                fail(
                    "target-build-evidence",
                    f"{path}: expected exact build evidence {expected_builds}",
                )
        records.append(record)

    if seen != expected_target_ids:
        fail(
            "target-set",
            f"v1 target set mismatch; missing={sorted(expected_target_ids - seen)}, "
            f"extra={sorted(seen - expected_target_ids)}",
        )
    records.sort(key=lambda item: item["id"])
    return records


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def encoded_v1_index(records: list[dict[str, Any]]) -> bytes:
    targets = []
    for record in records:
        encoded = canonical_json(record)
        targets.append(
            {
                "id": record["id"],
                "path": f"catalog/targets/{record['id']}.json",
                "sha256": hashlib.sha256(encoded).hexdigest(),
                "canonicalSize": len(encoded),
            }
        )
    procedures = []
    for path in sorted(PROCEDURES_DIR.glob("*.json")):
        procedure = load_json(path)
        encoded = canonical_json(procedure)
        procedures.append(
            {
                "id": procedure["id"],
                "targetId": procedure["targetId"],
                "path": path.relative_to(ROOT).as_posix(),
                "sha256": hashlib.sha256(encoded).hexdigest(),
                "canonicalSize": len(encoded),
            }
        )
    index = {
        "schema": "org.mura.flash.target-catalog-index/v1",
        "targets": targets,
        "procedures": procedures,
    }
    return (
        json.dumps(index, ensure_ascii=False, allow_nan=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")


def encoded_v1_digests(index_bytes: bytes) -> bytes:
    paths = [
        V1_CONTRACT_PATH,
        V1_CONTRACT_SCHEMA_PATH,
        PROCEDURE_REGISTRY_PATH,
        PROCEDURE_REGISTRY_SCHEMA_PATH,
        IMMUTABILITY_PATH,
        TARGET_RECORD_SCHEMA_PATH,
        ROOT / "catalog" / "index-v1.schema.json",
        *sorted(V1_TARGETS_DIR.glob("*.json")),
        PROCEDURE_SCHEMA_PATH,
        *sorted(PROCEDURES_DIR.glob("*.json")),
        ROOT / "records" / "backup-result-v1.schema.json",
        ROOT / "records" / "transcript-event-v1.schema.json",
        ROOT / "replay" / "scenario-v1.schema.json",
        *sorted(SAMSUNG_EVIDENCE_ROOT.glob("*.json")),
        *sorted(SAMSUNG_SCENARIO_ROOT.glob("*.json")),
        *sorted(SOURCE_PARITY_ROOT.glob("**/*.json")),
    ]
    lines = []
    for path in sorted(paths, key=lambda item: item.relative_to(ROOT).as_posix()):
        data = index_bytes if path == V1_INDEX_PATH else path.read_bytes()
        lines.append(f"{hashlib.sha256(data).hexdigest()}  {path.relative_to(ROOT).as_posix()}\n")
    lines.append(f"{hashlib.sha256(index_bytes).hexdigest()}  catalog/index-v1.json\n")
    return "".join(sorted(lines, key=lambda line: line.split("  ", 1)[1])).encode("ascii")


def validate_v1_fixtures() -> None:
    manifest = load_json(V1_FIXTURE_MANIFEST)
    if not isinstance(manifest, dict) or set(manifest) != {"valid", "invalid"}:
        fail("fixture-manifest", f"{V1_FIXTURE_MANIFEST}: expected valid and invalid maps")
    if not isinstance(manifest["valid"], dict) or not isinstance(manifest["invalid"], dict):
        fail("fixture-manifest", f"{V1_FIXTURE_MANIFEST}: fixture groups must be objects")
    for relative, expected in manifest["valid"].items():
        if expected != "ok":
            fail("fixture-manifest", f"{relative}: valid fixture expectation must be 'ok'")
        validate_v1_document(V1_FIXTURE_ROOT / relative)
    for relative, expected in manifest["invalid"].items():
        try:
            validate_v1_document(V1_FIXTURE_ROOT / relative)
        except ValidationFailure as error:
            if error.reason != expected:
                fail(
                    "fixture-expectation",
                    f"{relative}: expected {expected!r}, got {error.reason!r}",
                )
        else:
            fail("fixture-expectation", f"{relative}: invalid fixture was accepted")


def validate_source_parity(procedures: dict[str, dict[str, Any]]) -> None:
    linked: dict[str, str] = {}
    for procedure_id, procedure in procedures.items():
        relative = procedure["sourceParity"]["path"]
        parity_path = ROOT / relative
        try:
            parity_path.resolve().relative_to(SOURCE_PARITY_ROOT.resolve())
        except ValueError:
            fail("source-parity-path", f"{procedure_id}: parity fixture escapes fixture root")
        if not parity_path.is_file():
            fail("source-parity-missing", f"{procedure_id}: missing {relative}")
        linked[procedure_id] = relative

    declared: dict[str, str] = {}
    for manifest_path in sorted(SOURCE_PARITY_ROOT.glob("*/manifest.json")):
        manifest = load_json(manifest_path)
        validate_hermetic_citation_objects(manifest, manifest_path)
        group = manifest_path.parent.name
        if group == "pico":
            for mapping in manifest["modelMappings"]:
                target_id = mapping["targetId"]
                matches = [
                    procedure_id
                    for procedure_id, procedure in procedures.items()
                    if procedure["targetId"] == target_id
                ]
                if len(matches) != 1:
                    fail("source-parity-closure", f"{target_id}: expected one PICO procedure")
                declared[matches[0]] = manifest_path.relative_to(ROOT).as_posix()
        else:
            for entry in manifest["procedureFixtures"]:
                procedure_id = entry["procedureId"]
                fixture_path = manifest_path.parent / entry["path"]
                fixture = load_json(fixture_path)
                validate_hermetic_citation_objects(fixture, fixture_path)
                if fixture.get("procedureId") != procedure_id:
                    fail("source-parity-id", f"{fixture_path}: procedureId mismatch")
                declared[procedure_id] = fixture_path.relative_to(ROOT).as_posix()
    if linked != declared:
        fail(
            "source-parity-closure",
            f"procedure parity links differ; linked={linked}, declared={declared}",
        )


def validate_samsung_evidence() -> None:
    manifest = load_json(SAMSUNG_EVIDENCE_MANIFEST)
    if (
        not isinstance(manifest, dict)
        or manifest.get("schema") != "org.mura.flash.evidence-manifest/v1"
        or manifest.get("targetId") != "samsung-galaxy-xr-sm-i610"
    ):
        fail("samsung-evidence", f"{SAMSUNG_EVIDENCE_MANIFEST}: invalid manifest identity")
    entries = manifest.get("files")
    if not isinstance(entries, list):
        fail("samsung-evidence", f"{SAMSUNG_EVIDENCE_MANIFEST}: files must be an array")
    names = {Path(entry.get("path", "")).name for entry in entries if isinstance(entry, dict)}
    if names != EXPECTED_SAMSUNG_EVIDENCE or len(entries) != len(names):
        fail(
            "samsung-evidence",
            f"{SAMSUNG_EVIDENCE_MANIFEST}: evidence closure mismatch",
        )
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {"path", "sha256"}:
            fail("samsung-evidence", f"{SAMSUNG_EVIDENCE_MANIFEST}: malformed entry")
        relative = entry["path"]
        digest = entry["sha256"]
        if (
            not isinstance(relative, str)
            or not relative.startswith("evidence/samsung/")
            or Path(relative).name not in EXPECTED_SAMSUNG_EVIDENCE
            or not isinstance(digest, str)
            or re.fullmatch(r"[0-9a-f]{64}", digest) is None
        ):
            fail("samsung-evidence", f"{SAMSUNG_EVIDENCE_MANIFEST}: malformed binding")
        path = ROOT / relative
        try:
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
        except OSError as error:
            fail("samsung-evidence", f"{path}: {error}")
        if actual != digest:
            fail("samsung-evidence-drift", f"{path}: immutable evidence digest mismatch")
        record = load_json(path)
        if (
            not isinstance(record, dict)
            or record.get("schema") != "org.mura.flash.evidence-record/v1"
            or record.get("targetId") != "samsung-galaxy-xr-sm-i610"
            or record.get("immutable") is not True
        ):
            fail("samsung-evidence", f"{path}: invalid evidence identity")
        validate_hermetic_citation_objects(record, path)

    ledger = load_json(SAMSUNG_EVIDENCE_ROOT / "official-build-ledger.json")
    assert isinstance(ledger, dict)
    observed = [
        (claim.get("build"), claim.get("swrev"))
        for claim in ledger.get("claims", [])
        if isinstance(claim, dict)
    ]
    if observed != [
        ("I610UEU1AYKE", "U1"),
        ("I610UEU2AZCI", "U2"),
        ("I610UEU2AZD8", "U2"),
        ("I610UEU2AZF3", "U2"),
    ]:
        fail("samsung-evidence", "official Samsung build ledger evidence changed")

    ayia = load_json(SAMSUNG_EVIDENCE_ROOT / "ayia-community-report.json")
    assert isinstance(ayia, dict)
    if [claim.get("build") for claim in ayia.get("claims", [])] != ["I610UEU1AYIA"]:
        fail("samsung-evidence", "AYIA community evidence changed")

    media = load_json(SAMSUNG_EVIDENCE_ROOT / "launch-unlock-media.json")
    assert isinstance(media, dict)
    media_records = media.get("media")
    if not isinstance(media_records, list) or len(media_records) != 3:
        fail("samsung-evidence", "launch unlock media hash closure changed")
    for item in media_records:
        if (
            not isinstance(item, dict)
            or re.fullmatch(r"(?!0{64})[0-9a-f]{64}", str(item.get("sha256"))) is None
            or not isinstance(item.get("size"), int)
            or item["size"] < 1
        ):
            fail("samsung-evidence", "launch unlock media requires immutable hash and size")


def _scenario_typed_value_matches(value_type: str, value: Any) -> bool:
    if value_type == "boolean":
        return isinstance(value, bool)
    if value_type in {"duration-ms", "integer"}:
        return (
            isinstance(value, int)
            and not isinstance(value, bool)
            and (value_type != "duration-ms" or value >= 0)
        )
    if value_type == "string-list":
        return isinstance(value, list) and all(isinstance(item, str) for item in value)
    if not isinstance(value, str):
        return False
    return value_type != "digest" or re.fullmatch(r"[0-9a-f]{64}", value) is not None


def validate_samsung_procedure_policy(
    procedure: dict[str, Any],
    registry: dict[str, dict[str, Any]],
) -> None:
    if procedure.get("qualification") != {
        "use": "test-only",
        "hardware": "unqualified",
        "writesEnabled": False,
    }:
        fail("samsung-policy", "Samsung procedure must remain test-only and write-disabled")
    if any(operation["enabled"] is not False for operation in procedure["operations"]) or any(
        flow["enabled"] is not False for flow in procedure["flows"]
    ):
        fail("samsung-policy", "all Samsung operations and flows must remain disabled")
    if (
        len(procedure["artifacts"]) != 1
        or procedure["artifacts"][0]["id"] != "ayia-full-package"
        or procedure["artifacts"][0]["digest"]["kind"] != "unknown"
    ):
        fail("samsung-policy", "AYIA must remain a user-supplied unknown-digest artifact")
    expected_partitions = {
        "efs-device-profile",
        "persist-display-calibration",
        "qvr-calibration",
        "persist-sensor-registry",
    }
    partitions = {item["id"]: item for item in procedure["partitions"]}
    if set(partitions) != expected_partitions or any(
        not item["protected"] or not item["unitBound"] or item["qualifiedForWrite"]
        for item in partitions.values()
    ):
        fail("samsung-policy", "protected Samsung unit state must remain write-unqualified")
    required_backups = {
        item["partition"]["partitionId"]
        for item in procedure["backups"]
        if item["requiredBeforeWrites"] and item["unitBound"] and item["minimumMatchingReads"] >= 2
    }
    if required_backups != expected_partitions:
        fail("samsung-policy", "every protected Samsung state class requires two-read backup")

    operation_by_id = {item["id"]: item for item in procedure["operations"]}
    write_operations = {
        operation["id"]
        for operation in procedure["operations"]
        if registry[operation["variant"]]["safetyClass"] == "device-write"
    }
    if write_operations != {"simulation-only-unqualified-write-package"}:
        fail(
            "samsung-policy",
            "Samsung procedure may contain only the named disabled simulation write",
        )

    for variant_id in (
        "samsung.package-inspect",
        "samsung.download-observe",
        "samsung.download-flash-package",
    ):
        definition = registry.get(variant_id)
        if definition is None:
            fail("samsung-policy", f"missing closed registry operation {variant_id}")
        parameters = {item["name"]: item["value"] for item in definition["algorithmParameters"]}
        if parameters.get("arbitrary-argv") is not False:
            fail("samsung-policy", f"{variant_id} must prohibit arbitrary argv")
    inspection = registry["samsung.package-inspect"]
    inspection_inputs = {item["name"] for item in inspection["inputs"]}
    inspection_parameters = {
        item["name"]: item["value"] for item in inspection["algorithmParameters"]
    }
    if (
        "expectedDigest" not in inspection_inputs
        or "exactPackageMembers" not in inspection_inputs
        or inspection_parameters.get("expected-digest-required-before-inspection") is not True
        or inspection_parameters.get("exact-filenames-required-before-verified-output") is not True
        or "member-order" in inspection_parameters
    ):
        fail(
            "samsung-policy",
            "Samsung package verification requires digest and exact filenames "
            "without invented order",
        )
    observation = registry["samsung.download-observe"]
    observation_outputs = {item["name"] for item in observation["outputs"]}
    observation_parameters = {
        item["name"]: item["value"] for item in observation["algorithmParameters"]
    }
    if (
        "csc" in observation_outputs
        or "warrantyVoid" not in observation_outputs
        or "WARRANTY VOID" not in observation_parameters.get("capture", [])
    ):
        fail(
            "samsung-policy",
            "Samsung Download capture must omit invented CSC and include WARRANTY VOID",
        )
    flash_parameters = {
        item["name"]: item["value"]
        for item in registry["samsung.download-flash-package"]["algorithmParameters"]
    }
    flash_inputs = {
        item["name"]: item for item in registry["samsung.download-flash-package"]["inputs"]
    }
    if (
        "member-order" in flash_parameters
        or flash_inputs.get("transportEvidence", {}).get("type") != "string"
        or flash_parameters.get("repartition") is not False
        or flash_parameters.get("pit-substitution") is not False
        or flash_parameters.get("automatic-retry") is not False
    ):
        fail("samsung-policy", "Samsung flash semantics must prohibit PIT/repartition/retry")

    state_ids = {item["id"] for item in procedure["states"]}
    required_states = {
        "rollback-unverified",
        "flash-outcome-unknown",
        "simulation-only-unqualified-package-hash-failure",
        "simulation-only-unqualified-package-member-failure",
        "simulation-only-unqualified-package-unavailable",
        "unlock-outcome-unknown",
        "unlock-unverified",
    }
    if not required_states <= state_ids:
        fail("samsung-policy", "Samsung uncertainty terminal states are incomplete")

    flows = {item["id"]: item for item in procedure["flows"]}
    expected_flows = {
        "ayke-to-ayia-rollback",
        "ayia-oem-unlock",
        "simulation-only-unqualified-ayke-rollback-unlock-disabled-plan",
        "simulation-only-unqualified-package-write-edge-cases",
        "u2-rollback-protected",
        "unknown-build-safe-stop",
    }
    if set(flows) != expected_flows:
        fail("samsung-policy", "Samsung build-shaped flow closure changed")
    ayke_steps = [item["operationId"] for item in flows["ayke-to-ayia-rollback"]["steps"]]
    if ayke_steps != [
        "probe-model",
        "probe-build",
        "probe-csc",
        "refuse-ayke-rollback-unverified",
    ]:
        fail("samsung-policy", "AYKE runtime path must stop rollback-unverified before writes")
    full_plan_steps = [
        item["operationId"]
        for item in flows["simulation-only-unqualified-ayke-rollback-unlock-disabled-plan"]["steps"]
    ]
    required_plan_order = [
        "probe-model",
        "probe-build",
        "probe-csc",
        "simulation-only-unqualified-enter-download-mode",
        "simulation-only-unqualified-observe-download-u1",
        "simulation-only-unqualified-inspect-package",
        "simulation-only-unqualified-confirm-offline-inspection",
        "simulation-only-unqualified-confirm-protected-backups",
        "simulation-only-unqualified-write-package",
        "simulation-only-unqualified-reconnect-after-write",
        "simulation-only-unqualified-verify-ayia-model",
        "simulation-only-unqualified-verify-ayia-build",
        "simulation-only-unqualified-verify-ayia-csc",
        "enable-developer-options",
        "enable-oem-unlocking",
        "enter-oem-unlock-confirmation",
        "accept-oem-unlock-and-wipe",
        "reconnect-after-unlock",
        "verify-ayia-after-unlock",
        "enter-post-unlock-download-mode",
        "observe-post-unlock-download-u1",
        "observe-unlocked-warning",
    ]
    if full_plan_steps != required_plan_order:
        fail("samsung-policy", "disabled AYKE rollback-plus-unlock plan order changed")
    edge_steps = [
        item["operationId"]
        for item in flows["simulation-only-unqualified-package-write-edge-cases"]["steps"]
    ]
    if edge_steps != [
        "simulation-only-unqualified-inspect-package",
        "simulation-only-unqualified-confirm-offline-inspection",
        "simulation-only-unqualified-confirm-protected-backups",
        "simulation-only-unqualified-write-package",
    ]:
        fail("samsung-policy", "simulation-only package/write edge flow changed")
    evidence_inputs = {item["id"]: item for item in procedure["runtimeInputs"]}
    if {
        item_id: (
            evidence_inputs.get(item_id, {}).get("type"),
            evidence_inputs.get(item_id, {}).get("required"),
        )
        for item_id in (
            "fixture-expected-package-digest",
            "fixture-exact-package-members",
            "fixture-download-transport-evidence",
        )
    } != {
        "fixture-expected-package-digest": ("digest", False),
        "fixture-exact-package-members": ("string-list", False),
        "fixture-download-transport-evidence": ("string", False),
    }:
        fail("samsung-policy", "Samsung fixture evidence inputs changed")
    write_operation = operation_by_id["simulation-only-unqualified-write-package"]
    if (
        write_operation["idempotence"] != "non-idempotent"
        or {edge["recoveryId"] for edge in write_operation["failureEdges"]}
        != {"simulation-only-unqualified-flash-outcome-unknown"}
        or {edge["recoveryId"] for edge in write_operation["engineFailureEdges"]}
        != {"simulation-only-unqualified-flash-outcome-unknown"}
    ):
        fail("samsung-policy", "write uncertainty must terminate unknown with no retry")
    ayia_steps = [item["operationId"] for item in flows["ayia-oem-unlock"]["steps"]]
    if (
        "observe-post-unlock-download-u1" not in ayia_steps
        or ayia_steps[-1] != "observe-unlocked-warning"
        or ayia_steps.index("observe-post-unlock-download-u1")
        > ayia_steps.index("observe-unlocked-warning")
    ):
        fail(
            "samsung-policy",
            "AYIA unlock success requires independent post-reboot Download observation",
        )
    for flow_id in (
        "ayke-to-ayia-rollback",
        "u2-rollback-protected",
        "unknown-build-safe-stop",
    ):
        for reference in flows[flow_id]["steps"]:
            operation = operation_by_id[reference["operationId"]]
            if registry[operation["variant"]]["safetyClass"] in DESTRUCTIVE_SAFETY_CLASSES:
                fail("samsung-policy", f"{flow_id} must contain no state-changing operation")

    parity = load_json(
        ROOT / "tests/fixtures/source-parity/samsung/"
        "samsung-galaxy-xr-ayke-to-ayia-rollback-unlock.json"
    )
    plan = parity.get("disabledAykeRollbackUnlockPlan", {})
    if (
        plan.get("status") != "disabled-procedure-flow-simulation-only-unqualified"
        or plan.get("procedureFlowId")
        != "simulation-only-unqualified-ayke-rollback-unlock-disabled-plan"
        or plan.get("edgeFlowId") != "simulation-only-unqualified-package-write-edge-cases"
        or plan.get("runtimeTerminalBeforeWrite") != "rollback-unverified"
        or plan.get("firstUnresolvedGate") != "ayke-to-ayia-rollback-not-demonstrated"
        or plan.get("automaticRetry") is not False
        or "perform-one-no-retry-evidence-bound-package-write" not in plan.get("orderedSteps", [])
        or parity.get("packageInspectionContract", {}).get("knownExpectedDigest") is not None
        or parity.get("packageInspectionContract", {}).get("knownExactMemberFilenames") != []
    ):
        fail("samsung-policy", "disabled AYKE plan or evidence gates are incomplete")


def validate_samsung_scenarios(
    procedure: dict[str, Any],
    registry: dict[str, dict[str, Any]],
    scenario_schema: dict[str, Any],
    contract: dict[str, Any],
) -> None:
    operation_by_id = {item["id"]: item for item in procedure["operations"]}
    flow_ids = {item["id"] for item in procedure["flows"]}
    state_ids = {item["id"] for item in procedure["states"]}
    runtime_inputs = {item["id"]: item for item in procedure["runtimeInputs"]}
    value_types = set(load_json(PROCEDURE_REGISTRY_PATH)["valueTypes"])
    scenario_ids: set[str] = set()
    covered_flows: set[str] = set()
    covered_terminals: set[str] = set()

    for path in sorted(SAMSUNG_SCENARIO_ROOT.glob("*.json")):
        scenario = load_json(path)
        validate_schema(scenario, scenario_schema, scenario_schema)
        assert isinstance(scenario, dict)
        scenario_id = scenario["id"]
        if path.stem != scenario_id or scenario_id in scenario_ids:
            fail("samsung-scenario", f"{path}: duplicate or mismatched scenario id")
        scenario_ids.add(scenario_id)
        covered_flows.add(scenario["flowId"])
        expected_simulation = scenario_id != "samsung-normal-disabled-plan"
        if (
            scenario["procedureId"] != procedure["id"]
            or scenario["flowId"] not in flow_ids
            or scenario["simulateDisabled"] is not expected_simulation
            or scenario["clock"] != {"startTimestamp": "2026-09-27T12:00:00.000Z", "tickMs": 10}
            or scenario["adapterCapabilities"] != []
        ):
            fail("samsung-scenario", f"{path}: nondeterministic or mismatched replay envelope")

        supplied = {item["name"]: item for item in scenario["inputs"]}
        if len(supplied) != len(scenario["inputs"]):
            fail("samsung-scenario", f"{path}: duplicate input")
        for input_id, definition in runtime_inputs.items():
            value = supplied.get(input_id)
            if value is None and definition["required"]:
                fail("samsung-scenario", f"{path}: missing required input {input_id}")
            if value is not None and value["type"] != definition["type"]:
                fail("samsung-scenario", f"{path}: input type mismatch for {input_id}")
        for value in supplied.values():
            if value["type"] not in value_types or not _scenario_typed_value_matches(
                value["type"], value["value"]
            ):
                fail("samsung-scenario", f"{path}: invalid typed input {value['name']}")

        durations = {
            item["operationId"]: item["durationMs"] for item in scenario["operationDurations"]
        }
        if len(durations) != len(scenario["operationDurations"]):
            fail("samsung-scenario", f"{path}: duplicate operation duration")
        response_operations: set[str] = set()
        for response in scenario["responses"]:
            operation_id = response.get("operationId", response.get("afterOperationId"))
            if operation_id not in operation_by_id:
                fail("samsung-scenario", f"{path}: unknown operation {operation_id!r}")
            response_operations.add(operation_id)
            operation = operation_by_id[operation_id]
            definition = registry[operation["variant"]]
            if response["kind"] == "failure":
                if response["failureClass"] not in definition["failureClasses"]:
                    fail("samsung-scenario", f"{path}: undeclared failure response")
                continue
            if response["kind"] == "interruption":
                continue
            outputs = {item["name"]: item for item in response["outputs"]}
            ports = {item["name"]: item for item in definition["outputs"]}
            required = {name for name, port in ports.items() if port["required"]}
            if len(outputs) != len(response["outputs"]) or set(outputs) != required:
                fail("samsung-scenario", f"{path}: output closure mismatch for {operation_id}")
            for name, value in outputs.items():
                if (
                    value["type"] != ports[name]["type"]
                    or value["type"] not in value_types
                    or not _scenario_typed_value_matches(value["type"], value["value"])
                ):
                    fail("samsung-scenario", f"{path}: bad typed output {operation_id}.{name}")
        if set(durations) != response_operations:
            fail("samsung-scenario", f"{path}: durations must cover exact response operations")
        expected = scenario["expected"]
        covered_terminals.add(expected["terminalStateId"])
        if (
            expected["terminalStateId"] not in state_ids
            or not expected["eventKinds"]
            or expected["eventKinds"][0] != "session-start"
            or expected["eventKinds"][-1] != "session-end"
            or (
                expected["errorCode"] is not None
                and expected["errorCode"] not in contract["errorCodes"]
            )
        ):
            fail("samsung-scenario", f"{path}: invalid expected replay result")

    if scenario_ids != EXPECTED_SAMSUNG_SCENARIOS:
        fail(
            "samsung-scenario",
            "Samsung scenario closure mismatch; "
            f"missing={sorted(EXPECTED_SAMSUNG_SCENARIOS - scenario_ids)}, "
            f"extra={sorted(scenario_ids - EXPECTED_SAMSUNG_SCENARIOS)}",
        )
    if covered_flows != flow_ids:
        fail(
            "samsung-scenario",
            f"Samsung scenario flow coverage mismatch; covered={sorted(covered_flows)}",
        )
    required_terminals = {
        "download-blocked",
        "download-entry-unresolved",
        "oem-unlock-absent",
        "rollback-protected",
        "rollback-unverified",
        "safe-stop",
        "flash-outcome-unknown",
        "simulation-only-unqualified-package-hash-failure",
        "simulation-only-unqualified-package-member-failure",
        "simulation-only-unqualified-package-unavailable",
        "unknown-build-safe-stop",
        "unlock-declined",
        "unlock-outcome-unknown",
        "unlock-unverified",
        "unlocked-observed",
    }
    if not required_terminals <= covered_terminals:
        fail(
            "samsung-scenario",
            "Samsung terminal coverage incomplete; "
            f"missing={sorted(required_terminals - covered_terminals)}",
        )


def load_v1() -> tuple[list[dict[str, Any]], bytes, bytes]:
    contract_schema = check_self_contained_schema(
        V1_CONTRACT_SCHEMA_PATH, load_json(V1_CONTRACT_SCHEMA_PATH)
    )
    registry_schema = check_self_contained_schema(
        PROCEDURE_REGISTRY_SCHEMA_PATH, load_json(PROCEDURE_REGISTRY_SCHEMA_PATH)
    )
    contract = load_json(V1_CONTRACT_PATH)
    registry_document = load_json(PROCEDURE_REGISTRY_PATH)
    validate_schema(contract, contract_schema, contract_schema)
    validate_schema(registry_document, registry_schema, registry_schema)
    assert isinstance(contract, dict) and isinstance(registry_document, dict)

    schema_refs = contract["documentSchemas"]
    schema_names = [item["schema"] for item in schema_refs]
    schema_paths = [item["path"] for item in schema_refs]
    if len(schema_names) != len(set(schema_names)) or len(schema_paths) != len(set(schema_paths)):
        fail("contract-schema-reference", f"{V1_CONTRACT_PATH}: duplicate schema reference")
    loaded_schemas: dict[str, dict[str, Any]] = {}
    for item in schema_refs:
        path = ROOT / item["path"]
        loaded_schemas[item["schema"]] = check_self_contained_schema(path, load_json(path))

    registry_ref = contract["procedureRegistry"]
    if (
        registry_ref["schema"] != registry_document["schema"]
        or ROOT / registry_ref["path"] != PROCEDURE_REGISTRY_PATH
    ):
        fail("contract-registry-reference", f"{V1_CONTRACT_PATH}: registry reference mismatch")
    registry = validate_registry(registry_document, contract)
    validate_immutability()
    validate_v1_fixtures()
    validate_samsung_evidence()

    v0_contract = load_json(CONTRACT_PATH)
    expected_target_ids = set(v0_contract["targetIds"])
    target_schema = loaded_schemas["org.mura.flash.target-record/v1"]
    records = load_v1_catalog(target_schema, expected_target_ids)
    procedure_schema = loaded_schemas["org.mura.flash.install-procedure/v1"]
    declared_procedures = {
        procedure_id: target_id
        for target_id, procedure_ids in EXPECTED_PROCEDURES.items()
        for procedure_id in procedure_ids
    }
    if PROCEDURES_DIR.exists():
        seen_procedures: set[str] = set()
        procedures: dict[str, dict[str, Any]] = {}
        for path in sorted(PROCEDURES_DIR.glob("*.json")):
            procedure = validate_procedure(
                load_json(path), path, procedure_schema, registry, expected_target_ids
            )
            catalog_id = path.stem
            if procedure["id"] != catalog_id:
                fail("filename-id-mismatch", f"{path}: filename must equal procedure id")
            if catalog_id not in declared_procedures:
                fail("procedure-catalog", f"{path}: procedure is not declared by target catalog")
            if declared_procedures[catalog_id] != procedure["targetId"]:
                fail("procedure-catalog", f"{path}: procedure target does not match catalog")
            if catalog_id in seen_procedures:
                fail("duplicate-procedure", f"{path}: duplicate procedure id")
            seen_procedures.add(catalog_id)
            procedures[catalog_id] = procedure
        expected_procedures = set(declared_procedures)
        if seen_procedures != expected_procedures:
            fail(
                "procedure-set",
                f"procedure set mismatch; missing={sorted(expected_procedures - seen_procedures)}, "
                f"extra={sorted(seen_procedures - expected_procedures)}",
            )
        validate_source_parity(procedures)
        samsung = procedures["samsung-galaxy-xr-ayke-to-ayia-rollback-unlock"]
        validate_samsung_procedure_policy(samsung, registry)
        validate_samsung_scenarios(
            samsung,
            registry,
            loaded_schemas["org.mura.flash.replay-scenario/v1"],
            contract,
        )

    index_bytes = encoded_v1_index(records)
    index_schema = loaded_schemas["org.mura.flash.target-catalog-index/v1"]
    validate_schema(load_json_bytes(index_bytes, V1_INDEX_PATH), index_schema, index_schema)
    return records, index_bytes, encoded_v1_digests(index_bytes)


def load_json_bytes(data: bytes, path: Path) -> Any:
    try:
        return json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_unique_object,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"non-finite number {value}")
            ),
        )
    except (UnicodeError, json.JSONDecodeError, DuplicateKey, ValueError) as error:
        fail("generated-json", f"{path}: {error}")


def validate_v1_document(path: Path) -> None:
    document = load_json(path)
    if not isinstance(document, dict) or not isinstance(document.get("schema"), str):
        fail("document-schema", f"{path}: missing schema discriminator")
    schema_id = document["schema"]

    contract = load_json(V1_CONTRACT_PATH)
    assert isinstance(contract, dict)
    schemas = {
        item["schema"]: check_self_contained_schema(
            ROOT / item["path"], load_json(ROOT / item["path"])
        )
        for item in contract["documentSchemas"]
    }
    if schema_id == "org.mura.flash.procedure-registry/v1":
        registry_schema = check_self_contained_schema(
            PROCEDURE_REGISTRY_SCHEMA_PATH, load_json(PROCEDURE_REGISTRY_SCHEMA_PATH)
        )
        validate_schema(document, registry_schema, registry_schema)
        validate_registry(document, contract)
        return
    if schema_id not in schemas:
        fail("document-schema", f"{path}: unknown schema {schema_id!r}")

    schema = schemas[schema_id]
    if schema_id == "org.mura.flash.install-procedure/v1":
        registry_schema = check_self_contained_schema(
            PROCEDURE_REGISTRY_SCHEMA_PATH, load_json(PROCEDURE_REGISTRY_SCHEMA_PATH)
        )
        registry_document = load_json(PROCEDURE_REGISTRY_PATH)
        validate_schema(registry_document, registry_schema, registry_schema)
        assert isinstance(registry_document, dict)
        registry = validate_registry(registry_document, contract)
        v0_contract = load_json(CONTRACT_PATH)
        validate_procedure(document, path, schema, registry, set(v0_contract["targetIds"]))
    else:
        validate_schema(document, schema, schema)
        validate_source_citations(document, path)


def encoded_catalog(recipes: list[dict[str, Any]]) -> bytes:
    return (
        json.dumps(recipes, ensure_ascii=False, allow_nan=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")


def encoded_digest() -> bytes:
    digest = hashlib.sha256(CONTRACT_PATH.read_bytes()).hexdigest()
    return f"{digest}  v0.json\n".encode("ascii")


def write_or_check(path: Path, expected: bytes, check: bool) -> None:
    if check:
        try:
            actual = path.read_bytes()
        except OSError as error:
            fail("generated-missing", f"{path}: {error}")
        if actual != expected:
            fail("generated-stale", f"{path}: generated file is stale")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(expected)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument(
        "--check", action="store_true", help="validate and reject stale generated files"
    )
    action.add_argument(
        "--validate", type=Path, metavar="RECIPE", help="validate one recipe without generating"
    )
    action.add_argument(
        "--validate-v1",
        type=Path,
        metavar="DOCUMENT",
        help="validate one v1 document without generating",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        contract, _contract_schema, recipe_schema = load_contract()
        if args.validate is not None:
            path = args.validate.resolve()
            validate_recipe(load_json(path), path, contract, recipe_schema)
            return 0
        if args.validate_v1 is not None:
            validate_v1_document(args.validate_v1.resolve())
            return 0

        recipes = load_catalog(contract, recipe_schema)
        _records, v1_index, v1_digests = load_v1()
        write_or_check(INDEX_PATH, encoded_catalog(recipes), args.check)
        write_or_check(DIGEST_PATH, encoded_digest(), args.check)
        write_or_check(V1_INDEX_PATH, v1_index, args.check)
        write_or_check(V1_DIGEST_PATH, v1_digests, args.check)
        return 0
    except ValidationFailure as error:
        print(f"{PUBLIC_ERROR} [{error.reason}]: {error}", file=sys.stderr)
        try:
            contract = load_json(CONTRACT_PATH)
            return int(contract.get("errorCodes", {}).get(PUBLIC_ERROR, 2))
        except ValidationFailure:
            return 2


if __name__ == "__main__":
    raise SystemExit(main())
