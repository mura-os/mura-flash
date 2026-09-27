"""Structural and semantic recipe validation."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

from jsonschema import Draft202012Validator, FormatChecker

from mura_flash.errors import RecipeInvalidError
from mura_flash.jsonio import loads_strict_json
from mura_flash.resources import read_data_text

type JsonObject = dict[str, Any]
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


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    """One deterministic validation failure."""

    path: str
    message: str

    def render(self) -> str:
        """Render the issue for human CLI output."""
        return f"{self.path}: {self.message}" if self.path else self.message


def _json_path(parts: Iterable[object]) -> str:
    return ".".join(str(part) for part in parts)


def _walk_fields(value: object, path: str = "") -> list[tuple[str, str]]:
    fields: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                continue
            child_path = f"{path}.{key}" if path else key
            fields.append((key, child_path))
            fields.extend(_walk_fields(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            child_path = f"{path}.{index}" if path else str(index)
            fields.extend(_walk_fields(child, child_path))
    return fields


@lru_cache(maxsize=1)
def load_contract() -> JsonObject:
    """Strictly load and structurally validate the bundled v0 contract."""
    contract = loads_strict_json(read_data_text("contracts/v0.json"))
    schema = loads_strict_json(read_data_text("contracts/v0.schema.json"))
    Draft202012Validator.check_schema(schema)
    errors = sorted(
        Draft202012Validator(schema).iter_errors(contract),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    if errors:
        rendered = "; ".join(
            f"{_json_path(error.absolute_path)}: {error.message}" for error in errors
        )
        raise RecipeInvalidError(f"invalid bundled contract: {rendered}")
    result = cast("JsonObject", contract)
    specs = cast("list[JsonObject]", result["probeIds"])
    probe_ids = [cast("str", spec["id"]) for spec in specs]
    facts = [cast("str", spec["fact"]) for spec in specs]
    if len(probe_ids) != len(set(probe_ids)):
        raise RecipeInvalidError("invalid bundled contract: duplicate probe id")
    if len(facts) != len(set(facts)):
        raise RecipeInvalidError("invalid bundled contract: duplicate fact id")
    return result


@lru_cache(maxsize=1)
def _recipe_validator() -> Draft202012Validator:
    schema = loads_strict_json(read_data_text("recipes/inspection-recipe-v1.schema.json"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate_recipe(recipe: object) -> tuple[ValidationIssue, ...]:
    """Validate one decoded recipe structurally and against the safety contract."""
    structural = sorted(
        _recipe_validator().iter_errors(recipe),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    issues = [
        ValidationIssue(_json_path(error.absolute_path), error.message) for error in structural
    ]
    if isinstance(recipe, dict):
        if recipe.get("schema") != "org.mura.flash.inspection-recipe/v1":
            issues.append(ValidationIssue("schema", "recipe is not inspection-only v1"))
        if recipe.get("authenticationStatus") != "test-only":
            issues.append(
                ValidationIssue("authenticationStatus", "authentication status must be test-only")
            )
        if recipe.get("writesEnabled") is not False:
            issues.append(ValidationIssue("writesEnabled", "writes must remain disabled"))
        for field, path in _walk_fields(recipe):
            if field in FORBIDDEN_COMMAND_FIELDS:
                issues.append(ValidationIssue(path, "executable command fields are forbidden"))
            if field in FORBIDDEN_STATE_FIELDS:
                issues.append(ValidationIssue(path, "transition and write fields are forbidden"))
    if issues or not isinstance(recipe, dict):
        return tuple(issues)

    contract = load_contract()
    target_ids = set(cast("list[str]", contract["targetIds"]))
    probe_specs = {spec["id"]: spec for spec in cast("list[JsonObject]", contract["probeIds"])}
    known_facts = {cast("str", spec["fact"]) for spec in probe_specs.values()}

    recipe_id = cast("str", recipe["id"])
    if recipe_id not in target_ids:
        issues.append(ValidationIssue("id", f"target is not in contract: {recipe_id!r}"))

    transports = set(cast("list[str]", recipe["transports"]))
    selected_facts: set[str] = set()
    for index, probe_id in enumerate(cast("list[str]", recipe["probes"])):
        spec = probe_specs.get(probe_id)
        if spec is None:
            issues.append(
                ValidationIssue(f"probes.{index}", f"probe is not in contract: {probe_id!r}")
            )
            continue
        transport = cast("str", spec["transport"])
        fact = cast("str", spec["fact"])
        selected_facts.add(fact)
        if transport not in transports:
            issues.append(
                ValidationIssue(
                    f"probes.{index}",
                    f"{probe_id!r} requires undeclared transport {transport!r}",
                )
            )

    redact_facts = set(cast("list[str]", recipe["redactFacts"]))
    for index, fact in enumerate(cast("list[str]", recipe["redactFacts"])):
        if fact not in known_facts:
            issues.append(
                ValidationIssue(f"redactFacts.{index}", f"fact is not in contract: {fact!r}")
            )
        elif fact not in selected_facts:
            issues.append(
                ValidationIssue(
                    f"redactFacts.{index}", f"fact is not selected by this recipe: {fact!r}"
                )
            )

    for spec in probe_specs.values():
        fact = cast("str", spec["fact"])
        if spec.get("sensitive") is True and fact in selected_facts and fact not in redact_facts:
            issues.append(
                ValidationIssue(
                    "redactFacts", f"sensitive selected fact must be redacted: {fact!r}"
                )
            )

    return tuple(issues)


def load_and_validate_recipe(path: Path) -> tuple[JsonObject | None, tuple[ValidationIssue, ...]]:
    """Strictly load and validate a recipe file."""
    try:
        decoded = loads_strict_json(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as error:
        return None, (ValidationIssue("", str(error)),)
    issues = validate_recipe(decoded)
    if issues or not isinstance(decoded, dict):
        return None, issues
    return cast("JsonObject", decoded), ()
