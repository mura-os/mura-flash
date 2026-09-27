#!/usr/bin/env python3
"""Validate inspection recipes and generate the shared catalog.

This tool intentionally uses only the Python standard library.  Recipe files
are data, never command descriptions: validation fails closed on duplicate
keys, schema drift, unknown targets or probes, and executable/state-changing
fields.
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
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
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

    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            fail("schema-min-items", f"{location}: too few items")
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


def load_catalog(
    contract: dict[str, Any], recipe_schema: dict[str, Any]
) -> list[dict[str, Any]]:
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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        contract, _contract_schema, recipe_schema = load_contract()
        if args.validate is not None:
            path = args.validate.resolve()
            validate_recipe(load_json(path), path, contract, recipe_schema)
            return 0

        recipes = load_catalog(contract, recipe_schema)
        write_or_check(INDEX_PATH, encoded_catalog(recipes), args.check)
        write_or_check(DIGEST_PATH, encoded_digest(), args.check)
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
