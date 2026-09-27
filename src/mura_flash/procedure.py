"""Frontend-neutral procedure selection, planning, and safety gates."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, cast

from mura_flash.errors import RecipeInvalidError, SafetyRefusalError
from mura_flash.v1_validation import (
    load_operation_registry,
    load_v1_contract,
    operation_index,
    validate_procedure_graph,
)
from mura_flash.validation import JsonObject


@dataclass(frozen=True, slots=True)
class PlanStep:
    """One ordered operation selected by the contract algorithm."""

    index: int
    operation_id: str
    variant: str
    enabled: bool
    would_execute: bool
    safety_class: str
    required_adapter_capability: str
    state_effect: str


@dataclass(frozen=True, slots=True)
class ProcedurePlan:
    """A deterministic, presentation-neutral plan."""

    procedure_id: str
    target_id: str
    flow_id: str
    procedure_enabled: bool
    flow_enabled: bool
    confirmations: tuple[str, ...]
    required_capabilities: tuple[str, ...]
    missing_capabilities: tuple[str, ...]
    steps: tuple[PlanStep, ...]

    def to_document(self) -> dict[str, object]:
        """Return a camel-case JSON-ready representation."""
        return {
            "procedureId": self.procedure_id,
            "targetId": self.target_id,
            "flowId": self.flow_id,
            "procedureEnabled": self.procedure_enabled,
            "flowEnabled": self.flow_enabled,
            "confirmations": list(self.confirmations),
            "requiredCapabilities": list(self.required_capabilities),
            "missingCapabilities": list(self.missing_capabilities),
            "steps": [
                {
                    "index": step.index,
                    "operationId": step.operation_id,
                    "variant": step.variant,
                    "enabled": step.enabled,
                    "wouldExecute": step.would_execute,
                    "safetyClass": step.safety_class,
                    "requiredAdapterCapability": step.required_adapter_capability,
                    "stateEffect": step.state_effect,
                }
                for step in self.steps
            ],
        }


def select_flow(procedure: JsonObject, flow_id: str | None = None) -> JsonObject:
    """Select an explicit flow or the contract's sole enabled flow."""
    flows = cast("list[JsonObject]", procedure["flows"])
    if flow_id is not None:
        matches = [flow for flow in flows if flow["id"] == flow_id]
        if len(matches) != 1:
            raise RecipeInvalidError(f"unknown flow {flow_id!r} in {procedure['id']!r}")
        return matches[0]
    enabled = [flow for flow in flows if flow["enabled"] is True]
    if not enabled and procedure["enabled"] is False and len(flows) == 1:
        return flows[0]
    if len(enabled) != 1:
        raise RecipeInvalidError(
            f"procedure {procedure['id']!r} does not have exactly one enabled flow"
        )
    return enabled[0]


def _reachable_operation_ids(procedure: JsonObject, flow: JsonObject) -> tuple[str, ...]:
    operations = {
        cast("str", operation["id"]): operation
        for operation in cast("list[JsonObject]", procedure["operations"])
    }
    recoveries = {
        cast("str", recovery["id"]): recovery
        for recovery in cast("list[JsonObject]", procedure["recovery"])
    }
    ordered: list[str] = []
    seen_operations: set[str] = set()
    seen_recoveries: set[str] = set()

    def visit_operation(operation_id: str) -> None:
        if operation_id in seen_operations:
            return
        seen_operations.add(operation_id)
        ordered.append(operation_id)
        operation = operations[operation_id]
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
        recovery = recoveries[recovery_id]
        for reference in cast("list[JsonObject]", recovery["steps"]):
            visit_operation(cast("str", reference["operationId"]))

    for reference in cast("list[JsonObject]", flow["steps"]):
        visit_operation(cast("str", reference["operationId"]))
    return tuple(ordered)


def plan_procedure(
    procedure: JsonObject,
    *,
    flow_id: str | None = None,
    adapter_capabilities: set[str] | frozenset[str] | None = None,
    registry: JsonObject | None = None,
    simulate_disabled: bool = False,
) -> ProcedurePlan:
    """Build one plan and preflight the complete reachable capability set."""
    selected_registry = registry or load_operation_registry()
    issues = validate_procedure_graph(procedure, selected_registry)
    if issues:
        raise RecipeInvalidError("; ".join(issue.render() for issue in issues))
    variants = operation_index(selected_registry)
    operations = {
        cast("str", operation["id"]): operation
        for operation in cast("list[JsonObject]", procedure["operations"])
    }
    flow = select_flow(procedure, flow_id)
    reachable = _reachable_operation_ids(procedure, flow)
    capabilities: set[str] = set()
    steps: list[PlanStep] = []
    flow_steps = [
        cast("str", reference["operationId"])
        for reference in cast("list[JsonObject]", flow["steps"])
    ]
    for index, operation_id in enumerate(flow_steps):
        operation = operations[operation_id]
        variant = variants[cast("str", operation["variant"])]
        enabled = cast("bool", operation["enabled"])
        if enabled:
            capabilities.add(cast("str", variant["requiredAdapterCapability"]))
        steps.append(
            PlanStep(
                index=index,
                operation_id=operation_id,
                variant=cast("str", operation["variant"]),
                enabled=enabled,
                would_execute=enabled or simulate_disabled,
                safety_class=cast("str", variant["safetyClass"]),
                required_adapter_capability=cast("str", variant["requiredAdapterCapability"]),
                state_effect=cast("str", variant["stateEffect"]),
            )
        )
    for operation_id in reachable:
        operation = operations[operation_id]
        if operation["enabled"] is True:
            variant = variants[cast("str", operation["variant"])]
            capabilities.add(cast("str", variant["requiredAdapterCapability"]))
    available = adapter_capabilities if adapter_capabilities is not None else capabilities
    missing = capabilities - set(available)
    confirmations = tuple(
        cast("str", reference["confirmationId"])
        for reference in cast("list[JsonObject]", flow["confirmations"])
    )
    return ProcedurePlan(
        procedure_id=cast("str", procedure["id"]),
        target_id=cast("str", procedure["targetId"]),
        flow_id=cast("str", flow["id"]),
        procedure_enabled=cast("bool", procedure["enabled"]),
        flow_enabled=cast("bool", flow["enabled"]),
        confirmations=confirmations,
        required_capabilities=tuple(sorted(capabilities)),
        missing_capabilities=tuple(sorted(missing)),
        steps=tuple(steps),
    )


def ensure_live_execution_safe(
    procedure: JsonObject,
    target: JsonObject,
    *,
    registry: JsonObject | None = None,
) -> None:
    """Refuse unqualified or state-changing live procedures before adapter creation."""
    selected_registry = registry or load_operation_registry()
    variants = operation_index(selected_registry)
    covered = set(
        cast(
            "list[str]",
            cast("JsonObject", load_v1_contract()["liveDestructivePolicyGate"])[
                "coveredSafetyClasses"
            ],
        )
    )
    operation_variants = [
        variants[cast("str", operation["variant"])]
        for operation in cast("list[JsonObject]", procedure["operations"])
        if operation["enabled"] is True
    ]
    state_changing = any(
        variant["safetyClass"] in covered or variant["stateEffect"] != "none"
        for variant in operation_variants
    )
    qualified = (
        target["hardwareQualification"] == "qualified"
        and target["enabled"] is True
        and procedure["enabled"] is True
        and cast("JsonObject", target.get("muraPolicy", {})).get("writesAllowed") is True
        and cast("JsonObject", procedure.get("muraPolicy", {})).get("liveDestructiveAllowed")
        is True
    )
    if state_changing or not qualified:
        raise SafetyRefusalError(
            "live procedure execution is unavailable; use deterministic replay"
        )


def create_live_adapter(
    procedure: JsonObject,
    target: JsonObject,
    factory: Callable[[], Any],
    *,
    registry: JsonObject | None = None,
) -> Any:
    """Apply the safety gate before invoking a supplied hardware adapter factory."""
    ensure_live_execution_safe(procedure, target, registry=registry)
    return factory()
