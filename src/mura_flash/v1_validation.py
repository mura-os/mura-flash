"""Strict loading and semantic validation for v1 procedure documents."""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable, Mapping
from functools import cache, lru_cache
from pathlib import Path
from typing import cast

from jsonschema import Draft202012Validator, FormatChecker

from mura_flash.errors import RecipeInvalidError
from mura_flash.jsonio import loads_strict_json
from mura_flash.resources import read_data_text
from mura_flash.validation import JsonObject, ValidationIssue

SCHEMA_PATHS: Mapping[str, str] = {
    "org.mura.flash.contract/v1": "contracts/v1.schema.json",
    "org.mura.flash.procedure-registry/v1": "contracts/procedure-v1.schema.json",
    "org.mura.flash.target-record/v1": "catalog/target-record-v1.schema.json",
    "org.mura.flash.target-catalog-index/v1": "catalog/index-v1.schema.json",
    "org.mura.flash.install-procedure/v1": "recipes/install-procedure-v1.schema.json",
    "org.mura.flash.replay-scenario/v1": "replay/scenario-v1.schema.json",
    "org.mura.flash.backup-result/v1": "records/backup-result-v1.schema.json",
    "org.mura.flash.transcript-event/v1": "records/transcript-event-v1.schema.json",
}

_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def _path(parts: Iterable[object]) -> str:
    return ".".join(str(part) for part in parts)


@cache
def _validator(schema_name: str) -> Draft202012Validator:
    try:
        schema_path = SCHEMA_PATHS[schema_name]
    except KeyError as error:
        raise RecipeInvalidError(f"unknown v1 document schema: {schema_name}") from error
    schema = loads_strict_json(read_data_text(schema_path))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate_v1_document(
    document: object,
    schema_name: str | None = None,
) -> tuple[ValidationIssue, ...]:
    """Validate a decoded v1 document against its declared schema."""
    declared = document.get("schema") if isinstance(document, dict) else None
    selected = schema_name or declared
    if not isinstance(selected, str):
        return (ValidationIssue("schema", "missing document schema"),)
    if schema_name is not None and declared != schema_name:
        return (ValidationIssue("schema", f"expected {schema_name!r}, got {declared!r}"),)
    try:
        validator = _validator(selected)
    except RecipeInvalidError as error:
        return (ValidationIssue("schema", error.message),)
    errors = sorted(
        validator.iter_errors(document),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return tuple(ValidationIssue(_path(error.absolute_path), error.message) for error in errors)


def decode_v1_document(text: str, schema_name: str | None = None) -> JsonObject:
    """Strictly decode raw JSON before applying the matching v1 schema."""
    try:
        document = loads_strict_json(text)
    except ValueError as error:
        raise RecipeInvalidError(str(error)) from error
    issues = validate_v1_document(document, schema_name)
    if issues or not isinstance(document, dict):
        rendered = "; ".join(issue.render() for issue in issues)
        raise RecipeInvalidError(rendered or "document must be a JSON object")
    return cast("JsonObject", document)


def load_v1_document(path: Path, schema_name: str | None = None) -> JsonObject:
    """Load one UTF-8 v1 JSON object with duplicate rejection and schema validation."""
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise RecipeInvalidError(f"{path}: {error}") from error
    try:
        return decode_v1_document(text, schema_name)
    except RecipeInvalidError as error:
        raise RecipeInvalidError(f"{path}: {error.message}") from error


@lru_cache(maxsize=1)
def load_v1_contract() -> JsonObject:
    """Load the bundled v1 authority and verify all declared schema bindings."""
    contract = decode_v1_document(
        read_data_text("contracts/v1.json"),
        "org.mura.flash.contract/v1",
    )
    declared = {
        cast("str", item["schema"]): cast("str", item["path"])
        for item in cast("list[JsonObject]", contract["documentSchemas"])
    }
    expected = {
        name: path
        for name, path in SCHEMA_PATHS.items()
        if name
        not in {
            "org.mura.flash.contract/v1",
            "org.mura.flash.inspection-recipe/v1",
            "org.mura.flash.procedure-registry/v1",
        }
    }
    if declared != expected:
        raise RecipeInvalidError("v1 contract documentSchemas do not match packaged schemas")
    registry_ref = cast("JsonObject", contract["procedureRegistry"])
    if (
        registry_ref.get("schema") != "org.mura.flash.procedure-registry/v1"
        or registry_ref.get("path") != "contracts/procedure-v1.json"
    ):
        raise RecipeInvalidError("v1 contract has an invalid procedure registry binding")
    return contract


def _duplicate_issues(
    items: list[JsonObject],
    *,
    collection: str,
    key: str = "id",
) -> list[ValidationIssue]:
    values = [item.get(key) for item in items if isinstance(item.get(key), str)]
    duplicates = {value for value, count in Counter(values).items() if count > 1}
    return [
        ValidationIssue(f"{collection}.{index}.{key}", f"duplicate {key}: {value!r}")
        for index, item in enumerate(items)
        if (value := item.get(key)) in duplicates
    ]


def validate_operation_registry(registry: JsonObject) -> tuple[ValidationIssue, ...]:
    """Validate registry closure without assigning meanings to operation IDs."""
    issues = list(validate_v1_document(registry, "org.mura.flash.procedure-registry/v1"))
    if issues:
        return tuple(issues)
    value_types = set(cast("list[str]", registry["valueTypes"]))
    safety_classes = set(cast("list[str]", registry["safetyClasses"]))
    operations = cast("list[JsonObject]", registry["operations"])
    issues.extend(_duplicate_issues(operations, collection="operations"))
    for index, operation in enumerate(operations):
        prefix = f"operations.{index}"
        if operation["safetyClass"] not in safety_classes:
            issues.append(
                ValidationIssue(
                    f"{prefix}.safetyClass",
                    f"unknown safety class: {operation['safetyClass']!r}",
                )
            )
        for field in ("inputs", "outputs"):
            ports = cast("list[JsonObject]", operation[field])
            issues.extend(_duplicate_issues(ports, collection=f"{prefix}.{field}", key="name"))
            for port_index, port in enumerate(ports):
                if port["type"] not in value_types:
                    issues.append(
                        ValidationIssue(
                            f"{prefix}.{field}.{port_index}.type",
                            f"unknown value type: {port['type']!r}",
                        )
                    )
        parameters = cast("list[JsonObject]", operation["algorithmParameters"])
        issues.extend(
            _duplicate_issues(
                parameters,
                collection=f"{prefix}.algorithmParameters",
                key="name",
            )
        )
    return tuple(issues)


@lru_cache(maxsize=1)
def load_operation_registry() -> JsonObject:
    """Load the operation registry named by the v1 contract."""
    load_v1_contract()
    registry = decode_v1_document(
        read_data_text("contracts/procedure-v1.json"),
        "org.mura.flash.procedure-registry/v1",
    )
    issues = validate_operation_registry(registry)
    if issues:
        raise RecipeInvalidError(
            "invalid bundled procedure registry: " + "; ".join(issue.render() for issue in issues)
        )
    return registry


def operation_index(registry: JsonObject) -> dict[str, JsonObject]:
    """Return registry operations keyed by ID after registry validation."""
    issues = validate_operation_registry(registry)
    if issues:
        raise RecipeInvalidError("; ".join(issue.render() for issue in issues))
    return {
        cast("str", operation["id"]): operation
        for operation in cast("list[JsonObject]", registry["operations"])
    }


def _ref_type(
    reference: object,
    *,
    artifacts: set[str],
    partitions: set[str],
    backups: set[str],
    states: set[str],
    runtime_inputs: Mapping[str, str],
    operations: Mapping[str, JsonObject],
    variants: Mapping[str, JsonObject],
) -> tuple[str | None, str | None]:
    if not isinstance(reference, dict):
        return None, "reference must be an object"
    kind = reference.get("kind")
    if kind == "constant":
        value_type = cast("str", reference.get("valueType"))
        value_error = _typed_value_error(value_type, reference.get("value"))
        return value_type, value_error
    key_by_kind = {
        "artifact": ("artifactId", artifacts, "artifact-ref"),
        "partition": ("partitionId", partitions, "partition-ref"),
        "backup": ("backupId", backups, "backup-ref"),
        "state": ("stateId", states, "state-ref"),
    }
    if kind in key_by_kind:
        key, known, value_type = key_by_kind[cast("str", kind)]
        identifier = reference.get(key)
        if identifier not in known:
            return None, f"unresolved {kind} reference: {identifier!r}"
        return value_type, None
    if kind == "runtime-input":
        input_id = reference.get("inputId")
        runtime_type = runtime_inputs.get(cast("str", input_id))
        if runtime_type is None:
            return None, f"unresolved runtime input reference: {input_id!r}"
        return runtime_type, None
    if kind == "operation-output":
        operation_id = reference.get("operationId")
        operation = operations.get(cast("str", operation_id))
        if operation is None:
            return None, f"unresolved operation reference: {operation_id!r}"
        variant = variants[cast("str", operation["variant"])]
        output_name = reference.get("outputName")
        outputs = {
            port["name"]: port["type"] for port in cast("list[JsonObject]", variant["outputs"])
        }
        if output_name not in outputs:
            return None, (f"operation {operation_id!r} has no output {output_name!r}")
        return cast("str", outputs[output_name]), None
    return None, f"unknown reference kind: {kind!r}"


def _typed_value_error(value_type: str, value: object) -> str | None:
    """Return an error when a scalar does not match its explicit registry tag."""
    if value is None:
        return f"{value_type!r} values cannot be null"
    if value_type == "boolean":
        return None if isinstance(value, bool) else "boolean value must be a boolean"
    if value_type in {"duration-ms", "integer"}:
        if not isinstance(value, int) or isinstance(value, bool):
            return f"{value_type} value must be an integer"
        if value_type == "duration-ms" and value < 0:
            return "duration-ms value must be non-negative"
        return None
    if value_type == "string-list":
        if isinstance(value, list) and all(isinstance(item, str) for item in value):
            return None
        return "string-list value must contain only strings"
    if not isinstance(value, str):
        return f"{value_type} value must be a string"
    if value_type == "digest" and _SHA256.fullmatch(value) is None:
        return "digest value must be a lowercase SHA-256 digest"
    return None


def validate_typed_value(value: JsonObject, *, path: str) -> tuple[ValidationIssue, ...]:
    """Validate the scalar representation selected by a typed-value tag."""
    value_type = value.get("type")
    if not isinstance(value_type, str):
        return (ValidationIssue(f"{path}.type", "typed value type must be a string"),)
    error = _typed_value_error(value_type, value.get("value"))
    return () if error is None else (ValidationIssue(f"{path}.value", error),)


def _output_references(value: object) -> tuple[str, ...]:
    references: list[str] = []
    if isinstance(value, dict):
        if value.get("kind") == "operation-output" and isinstance(value.get("operationId"), str):
            references.append(cast("str", value["operationId"]))
        for child in value.values():
            references.extend(_output_references(child))
    elif isinstance(value, list):
        for child in value:
            references.extend(_output_references(child))
    return tuple(references)


def _predicate_issues(
    predicate: JsonObject,
    *,
    path: str,
    artifacts: set[str],
    partitions: set[str],
    backups: set[str],
    states: set[str],
    runtime_inputs: Mapping[str, str],
    operations: Mapping[str, JsonObject],
    variants: Mapping[str, JsonObject],
    value_types: set[str],
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    kind = predicate["kind"]
    if kind == "state-assertion":
        state_id = cast("str", cast("JsonObject", predicate["state"])["stateId"])
        if state_id not in states:
            issues.append(
                ValidationIssue(
                    f"{path}.state.stateId",
                    f"unresolved state reference: {state_id!r}",
                )
            )
        return issues
    if kind == "output-present":
        _value_type, reference_error = _ref_type(
            predicate["value"],
            artifacts=artifacts,
            partitions=partitions,
            backups=backups,
            states=states,
            runtime_inputs=runtime_inputs,
            operations=operations,
            variants=variants,
        )
        if reference_error is not None:
            issues.append(ValidationIssue(f"{path}.value", reference_error))
        return issues

    predicate_types: list[str | None] = []
    for side in ("left", "right"):
        value_type, reference_error = _ref_type(
            predicate[side],
            artifacts=artifacts,
            partitions=partitions,
            backups=backups,
            states=states,
            runtime_inputs=runtime_inputs,
            operations=operations,
            variants=variants,
        )
        predicate_types.append(value_type)
        if reference_error is not None:
            issues.append(ValidationIssue(f"{path}.{side}", reference_error))
        elif value_type not in value_types:
            issues.append(
                ValidationIssue(
                    f"{path}.{side}",
                    f"unknown value type: {value_type!r}",
                )
            )
    if None not in predicate_types and predicate_types[0] != predicate_types[1]:
        issues.append(ValidationIssue(path, "predicate operands have different types"))
    if kind == "digest-equals" and any(value_type != "digest" for value_type in predicate_types):
        issues.append(ValidationIssue(path, "digest-equals requires digest operands"))
    return issues


def validate_procedure_graph(
    procedure: JsonObject,
    registry: JsonObject | None = None,
    *,
    target_ids: set[str] | None = None,
) -> tuple[ValidationIssue, ...]:
    """Validate all operation, flow, reference, failure, and recovery closure."""
    issues = list(validate_v1_document(procedure, "org.mura.flash.install-procedure/v1"))
    if issues:
        return tuple(issues)
    selected_registry = registry or load_operation_registry()
    try:
        variants = operation_index(selected_registry)
    except RecipeInvalidError as error:
        return (ValidationIssue("registry", error.message),)
    value_types = set(cast("list[str]", selected_registry["valueTypes"]))

    collections = {
        name: cast("list[JsonObject]", procedure[name])
        for name in (
            "runtimeInputs",
            "states",
            "artifacts",
            "partitions",
            "backups",
            "confirmations",
            "operations",
            "flows",
            "recovery",
        )
    }
    for name, items in collections.items():
        issues.extend(_duplicate_issues(items, collection=name))
    if target_ids is not None and procedure["targetId"] not in target_ids:
        issues.append(
            ValidationIssue(
                "targetId",
                f"unresolved target reference: {procedure['targetId']!r}",
            )
        )

    identifiers = {
        name: {cast("str", item["id"]) for item in items} for name, items in collections.items()
    }
    states = identifiers["states"]
    runtime_input_documents = {
        cast("str", item["id"]): item for item in collections["runtimeInputs"]
    }
    runtime_inputs = {
        input_id: cast("str", item["type"]) for input_id, item in runtime_input_documents.items()
    }
    artifacts = identifiers["artifacts"]
    partitions = identifiers["partitions"]
    backups = identifiers["backups"]
    confirmations = identifiers["confirmations"]
    recoveries = identifiers["recovery"]
    operation_documents = {cast("str", item["id"]): item for item in collections["operations"]}

    for index, runtime_input in enumerate(collections["runtimeInputs"]):
        if runtime_input["type"] not in value_types:
            issues.append(
                ValidationIssue(
                    f"runtimeInputs.{index}.type",
                    f"unknown value type: {runtime_input['type']!r}",
                )
            )

    for index, backup in enumerate(collections["backups"]):
        partition_id = cast("JsonObject", backup["partition"])["partitionId"]
        if partition_id not in partitions:
            issues.append(
                ValidationIssue(
                    f"backups.{index}.partition.partitionId",
                    f"unresolved partition reference: {partition_id!r}",
                )
            )

    for index, confirmation in enumerate(collections["confirmations"]):
        for class_index, safety_class in enumerate(
            cast("list[str]", confirmation["safetyClasses"])
        ):
            if safety_class not in set(cast("list[str]", selected_registry["safetyClasses"])):
                issues.append(
                    ValidationIssue(
                        f"confirmations.{index}.safetyClasses.{class_index}",
                        f"unknown safety class: {safety_class!r}",
                    )
                )

    for index, operation in enumerate(collections["operations"]):
        prefix = f"operations.{index}"
        variant_id = cast("str", operation["variant"])
        variant = variants.get(variant_id)
        if variant is None:
            issues.append(
                ValidationIssue(
                    f"{prefix}.variant",
                    f"operation is not in registry: {variant_id!r}",
                )
            )
            continue
        arguments = cast("list[JsonObject]", operation["arguments"])
        issues.extend(
            _duplicate_issues(arguments, collection=f"{prefix}.arguments", key="inputName")
        )
        supplied = {cast("str", argument["inputName"]): argument for argument in arguments}
        ports = {
            cast("str", port["name"]): port for port in cast("list[JsonObject]", variant["inputs"])
        }
        for name, port in ports.items():
            if port["required"] is True and name not in supplied:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.arguments",
                        f"missing required input: {name!r}",
                    )
                )
        for argument_index, argument in enumerate(arguments):
            name = cast("str", argument["inputName"])
            selected_port = ports.get(name)
            if selected_port is None:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.arguments.{argument_index}.inputName",
                        f"unknown input: {name!r}",
                    )
                )
                continue
            actual_type, reference_error = _ref_type(
                argument["value"],
                artifacts=artifacts,
                partitions=partitions,
                backups=backups,
                states=states,
                runtime_inputs=runtime_inputs,
                operations=operation_documents,
                variants=variants,
            )
            if reference_error is not None:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.arguments.{argument_index}.value",
                        reference_error,
                    )
                )
            elif actual_type != selected_port["type"]:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.arguments.{argument_index}.value",
                        f"expected type {selected_port['type']!r}, got {actual_type!r}",
                    )
                )
        for predicate_field in ("guards", "postconditions"):
            for predicate_index, predicate in enumerate(
                cast("list[JsonObject]", operation[predicate_field])
            ):
                issues.extend(
                    _predicate_issues(
                        predicate,
                        path=f"{prefix}.{predicate_field}.{predicate_index}",
                        artifacts=artifacts,
                        partitions=partitions,
                        backups=backups,
                        states=states,
                        runtime_inputs=runtime_inputs,
                        operations=operation_documents,
                        variants=variants,
                        value_types=value_types,
                    )
                )
        from_states = [
            cast("str", reference["stateId"])
            for reference in cast("list[JsonObject]", operation["fromStates"])
        ]
        for state_index, state_id in enumerate(from_states):
            if state_id not in states:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.fromStates.{state_index}.stateId",
                        f"unresolved state reference: {state_id!r}",
                    )
                )
        to_state = operation["toState"]
        if isinstance(to_state, dict) and to_state["stateId"] not in states:
            issues.append(
                ValidationIssue(
                    f"{prefix}.toState.stateId",
                    f"unresolved state reference: {to_state['stateId']!r}",
                )
            )
        edges = cast("list[JsonObject]", operation["failureEdges"])
        issues.extend(
            _duplicate_issues(edges, collection=f"{prefix}.failureEdges", key="failureClass")
        )
        edge_classes = {cast("str", edge["failureClass"]) for edge in edges}
        declared_classes = set(cast("list[str]", variant["failureClasses"]))
        if edge_classes != declared_classes:
            issues.append(
                ValidationIssue(
                    f"{prefix}.failureEdges",
                    "failure edges must exactly cover registry failure classes",
                )
            )
        for edge_index, edge in enumerate(edges):
            recovery_id = edge.get("recoveryId")
            if recovery_id is not None and recovery_id not in recoveries:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.failureEdges.{edge_index}.recoveryId",
                        f"unresolved recovery reference: {recovery_id!r}",
                    )
                )
        engine_edges = cast("list[JsonObject]", operation["engineFailureEdges"])
        issues.extend(
            _duplicate_issues(
                engine_edges,
                collection=f"{prefix}.engineFailureEdges",
                key="failureClass",
            )
        )
        if {cast("str", edge["failureClass"]) for edge in engine_edges} != {
            "postcondition-failed",
            "interrupted",
        }:
            issues.append(
                ValidationIssue(
                    f"{prefix}.engineFailureEdges",
                    "engine failure edges must exactly cover postcondition-failed and interrupted",
                )
            )
        for edge_index, edge in enumerate(engine_edges):
            recovery_id = edge.get("recoveryId")
            if recovery_id is not None and recovery_id not in recoveries:
                issues.append(
                    ValidationIssue(
                        f"{prefix}.engineFailureEdges.{edge_index}.recoveryId",
                        f"unresolved recovery reference: {recovery_id!r}",
                    )
                )

    for collection_name in ("flows", "recovery"):
        for index, graph in enumerate(collections[collection_name]):
            prefix = f"{collection_name}.{index}"
            step_ids = [
                cast("str", ref["operationId"]) for ref in cast("list[JsonObject]", graph["steps"])
            ]
            if len(step_ids) != len(set(step_ids)):
                issues.append(ValidationIssue(f"{prefix}.steps", "duplicate operation step"))
            for step_index, operation_id in enumerate(step_ids):
                if operation_id not in operation_documents:
                    issues.append(
                        ValidationIssue(
                            f"{prefix}.steps.{step_index}.operationId",
                            f"unresolved operation reference: {operation_id!r}",
                        )
                    )
            if collection_name == "flows":
                initial_state = cast("JsonObject", graph["initialState"])["stateId"]
                if initial_state not in states:
                    issues.append(
                        ValidationIssue(
                            f"{prefix}.initialState.stateId",
                            f"unresolved state reference: {initial_state!r}",
                        )
                    )
                for confirmation_index, reference in enumerate(
                    cast("list[JsonObject]", graph["confirmations"])
                ):
                    confirmation_id = reference["confirmationId"]
                    if confirmation_id not in confirmations:
                        issues.append(
                            ValidationIssue(
                                f"{prefix}.confirmations.{confirmation_index}.confirmationId",
                                f"unresolved confirmation reference: {confirmation_id!r}",
                            )
                        )
                for predicate_index, predicate in enumerate(
                    cast("list[JsonObject]", graph["guards"])
                ):
                    issues.extend(
                        _predicate_issues(
                            predicate,
                            path=f"{prefix}.guards.{predicate_index}",
                            artifacts=artifacts,
                            partitions=partitions,
                            backups=backups,
                            states=states,
                            runtime_inputs=runtime_inputs,
                            operations=operation_documents,
                            variants=variants,
                            value_types=value_types,
                        )
                    )
            else:
                terminal_state = cast("JsonObject", graph["terminalState"])["stateId"]
                if terminal_state not in states:
                    issues.append(
                        ValidationIssue(
                            f"{prefix}.terminalState.stateId",
                            f"unresolved state reference: {terminal_state!r}",
                        )
                    )
                for state_index, reference in enumerate(
                    cast("list[JsonObject]", graph["fromStates"])
                ):
                    state_id = reference["stateId"]
                    if state_id not in states:
                        issues.append(
                            ValidationIssue(
                                f"{prefix}.fromStates.{state_index}.stateId",
                                f"unresolved state reference: {state_id!r}",
                            )
                        )

            positions = {operation_id: position for position, operation_id in enumerate(step_ids)}
            for step_index, operation_id in enumerate(step_ids):
                graph_operation = operation_documents.get(operation_id)
                if graph_operation is None:
                    continue
                before_execution = [
                    *cast("list[JsonObject]", graph_operation["arguments"]),
                    *cast("list[JsonObject]", graph_operation["guards"]),
                ]
                for source_id in _output_references(before_execution):
                    source_position = positions.get(source_id)
                    if source_position is not None and source_position >= step_index:
                        issues.append(
                            ValidationIssue(
                                f"{prefix}.steps.{step_index}",
                                f"operation output {source_id!r} is not available yet",
                            )
                        )
                for source_id in _output_references(graph_operation["postconditions"]):
                    source_position = positions.get(source_id)
                    if source_position is not None and source_position > step_index:
                        issues.append(
                            ValidationIssue(
                                f"{prefix}.steps.{step_index}",
                                f"postcondition output {source_id!r} is not available yet",
                            )
                        )

    enabled_flows = [flow for flow in collections["flows"] if cast("bool", flow["enabled"])]
    if procedure["enabled"] is True and len(enabled_flows) != 1:
        issues.append(
            ValidationIssue("flows", "enabled procedure must have exactly one enabled flow")
        )
    return tuple(issues)


def validate_catalog_closure(
    targets: Mapping[str, JsonObject],
    procedures: Mapping[str, JsonObject],
) -> tuple[ValidationIssue, ...]:
    """Validate target/procedure cross-document references."""
    issues: list[ValidationIssue] = []
    for target_id, target in targets.items():
        availability = cast("JsonObject", target["procedureAvailability"])
        declared = (
            set(cast("list[str]", availability["procedureIds"]))
            if availability["kind"] == "available"
            else set()
        )
        actual = {
            procedure_id
            for procedure_id, procedure in procedures.items()
            if procedure["targetId"] == target_id
        }
        if declared != actual:
            issues.append(
                ValidationIssue(
                    f"targets.{target_id}.procedureAvailability",
                    f"declared procedures {sorted(declared)!r} do not match "
                    f"loaded procedures {sorted(actual)!r}",
                )
            )
    for procedure_id, procedure in procedures.items():
        if procedure["targetId"] not in targets:
            issues.append(
                ValidationIssue(
                    f"procedures.{procedure_id}.targetId",
                    f"unresolved target reference: {procedure['targetId']!r}",
                )
            )
    return tuple(issues)
