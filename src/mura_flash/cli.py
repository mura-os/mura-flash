"""Command-line interface for inspection-only Mura tooling."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any, NoReturn, cast

from mura_flash.catalog import load_catalog
from mura_flash.errors import (
    DeviceAmbiguousError,
    DeviceMissingError,
    ExitCode,
    MuraFlashError,
    ProbeFailedError,
    ProbeTimeoutError,
    RecipeInvalidError,
    SafetyRefusalError,
)
from mura_flash.inspection import Inspector, Transport
from mura_flash.jsonio import canonical_json
from mura_flash.procedure import plan_procedure
from mura_flash.replay import replay_scenario
from mura_flash.runner import SubprocessRunner
from mura_flash.v1_catalog import load_v1_catalogs
from mura_flash.v1_validation import load_v1_document


class UsageError(MuraFlashError):
    """Invalid command-line syntax."""

    def __init__(self, message: str) -> None:
        super().__init__(message, ExitCode.USAGE)


class Parser(argparse.ArgumentParser):
    """Argument parser that reports usage without terminating the process."""

    def error(self, message: str) -> NoReturn:
        raise UsageError(message)


def _add_json_flag(parser: argparse.ArgumentParser, *, default: object) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        default=default,
        help="emit machine-readable JSON",
    )


def build_parser() -> Parser:
    """Build the complete v0 command grammar."""
    parser = Parser(prog="mura-flash", description="Inspect Mura headset targets safely")
    _add_json_flag(parser, default=False)
    commands = parser.add_subparsers(dest="command")

    targets = commands.add_parser("targets", help="list target recipes")
    _add_json_flag(targets, default=argparse.SUPPRESS)

    show = commands.add_parser("show", help="show one target recipe")
    show.add_argument("target")
    _add_json_flag(show, default=argparse.SUPPRESS)

    validate = commands.add_parser("validate", help="validate recipes")
    validate.add_argument("path", nargs="?", type=Path)
    _add_json_flag(validate, default=argparse.SUPPRESS)

    procedures = commands.add_parser("procedures", help="list v1 install procedures")
    procedures.add_argument("target", nargs="?")
    _add_json_flag(procedures, default=argparse.SUPPRESS)

    show_procedure = commands.add_parser(
        "show-procedure",
        help="show one v1 install procedure",
    )
    show_procedure.add_argument("procedure")
    _add_json_flag(show_procedure, default=argparse.SUPPRESS)

    plan = commands.add_parser("plan", help="plan one v1 install procedure")
    plan.add_argument("procedure")
    plan.add_argument("--flow")
    plan.add_argument("--capability", action="append", default=None)
    _add_json_flag(plan, default=argparse.SUPPRESS)

    replay = commands.add_parser("replay", help="replay one deterministic v1 scenario")
    replay.add_argument("procedure")
    replay.add_argument("--scenario", type=Path, required=True)
    _add_json_flag(replay, default=argparse.SUPPRESS)

    inspect = commands.add_parser("inspect", help="collect allowlisted device facts")
    inspect.add_argument("target")
    inspect.add_argument("--transport", choices=("adb", "fastboot"), required=True)
    inspect.add_argument("--serial")
    _add_json_flag(inspect, default=argparse.SUPPRESS)
    return parser


def _print_json(value: object, *, stream: Any | None = None) -> None:
    destination = sys.stdout if stream is None else stream
    print(json.dumps(value, sort_keys=True, separators=(",", ":")), file=destination)


def _print_canonical_json(value: object) -> None:
    print(canonical_json(value))


def _error_name(error: MuraFlashError) -> str:
    if isinstance(error, UsageError):
        return "usage"
    if isinstance(error, RecipeInvalidError):
        return "recipe-invalid"
    if isinstance(error, DeviceMissingError):
        return "device-missing"
    if isinstance(error, DeviceAmbiguousError):
        return "device-ambiguous"
    if isinstance(error, ProbeTimeoutError):
        return "probe-timeout"
    if isinstance(error, ProbeFailedError):
        return "probe-failed"
    if isinstance(error, SafetyRefusalError):
        return "safety-refusal"
    return "error"


def _run_command(arguments: argparse.Namespace) -> int:
    use_json = cast("bool", arguments.json)
    command = cast("str", arguments.command)
    if command == "targets":
        catalog = load_catalog()
        rows = [
            {
                "id": target_id,
                "displayName": cast("str", recipe["displayName"]),
                "vendor": cast("str", recipe["vendor"]),
            }
            for target_id, recipe in sorted(catalog.recipes.items())
        ]
        if use_json:
            _print_json({"targets": rows})
        else:
            for row in rows:
                print(f"{row['id']}\t{row['displayName']}")
        return ExitCode.OK

    if command == "show":
        recipe = load_catalog().get(cast("str", arguments.target))
        if use_json:
            _print_json(recipe)
        else:
            print(json.dumps(recipe, indent=2, sort_keys=True))
        return ExitCode.OK

    if command == "validate":
        path = cast("Path | None", arguments.path)
        catalog = load_catalog(path, require_complete=path is None)
        target_ids = sorted(catalog.recipes)
        if use_json:
            _print_json({"targets": target_ids, "valid": True})
        else:
            noun = "recipe" if len(target_ids) == 1 else "recipes"
            print(f"valid: {len(target_ids)} {noun}")
        return ExitCode.OK

    if command == "procedures":
        _targets, procedure_catalog = load_v1_catalogs()
        target = cast("str | None", arguments.target)
        selected = (
            procedure_catalog.for_target(target)
            if target is not None
            else tuple(procedure for _, procedure in sorted(procedure_catalog.procedures.items()))
        )
        rows = [
            {
                "id": procedure["id"],
                "targetId": procedure["targetId"],
                "enabled": procedure["enabled"],
            }
            for procedure in selected
        ]
        if use_json:
            _print_canonical_json({"procedures": rows})
        else:
            for row in rows:
                print(f"{row['id']}\t{row['targetId']}")
        return ExitCode.OK

    if command == "show-procedure":
        _targets, procedure_catalog = load_v1_catalogs()
        procedure = procedure_catalog.get(cast("str", arguments.procedure))
        if use_json:
            _print_canonical_json(procedure)
        else:
            print(json.dumps(procedure, ensure_ascii=False, indent=2, sort_keys=True))
        return ExitCode.OK

    if command == "plan":
        _targets, procedure_catalog = load_v1_catalogs()
        procedure = procedure_catalog.get(cast("str", arguments.procedure))
        capabilities = cast("list[str] | None", arguments.capability)
        result = plan_procedure(
            procedure,
            flow_id=cast("str | None", arguments.flow),
            adapter_capabilities=set(capabilities) if capabilities is not None else None,
        ).to_document()
        if use_json:
            _print_canonical_json(result)
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return ExitCode.OK

    if command == "replay":
        _targets, procedure_catalog = load_v1_catalogs()
        procedure = procedure_catalog.get(cast("str", arguments.procedure))
        scenario = load_v1_document(
            cast("Path", arguments.scenario),
            "org.mura.flash.replay-scenario/v1",
        )
        result = replay_scenario(procedure, scenario).to_document()
        if use_json:
            _print_canonical_json(result)
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return ExitCode.OK if cast("bool", result["matchedExpected"]) else ExitCode.RECIPE_INVALID

    if command == "inspect":
        catalog = load_catalog()
        recipe = catalog.get(cast("str", arguments.target))
        inspection = Inspector(SubprocessRunner()).inspect(
            recipe,
            cast("Transport", arguments.transport),
            serial=cast("str | None", arguments.serial),
        )
        result = {
            "facts": inspection.facts,
            "serial": "<redacted>",
            "target": inspection.target,
            "toolVersion": inspection.tool_version,
            "transport": inspection.transport,
        }
        if use_json:
            _print_json(result)
        else:
            print(f"target: {inspection.target}")
            print(f"transport: {inspection.transport}")
            print("serial: <redacted>")
            for fact, value in inspection.facts.items():
                print(f"{fact}: {value}")
        print(inspection.transcript.to_jsonl(), end="", file=sys.stderr)
        return ExitCode.OK

    raise UsageError(f"unknown command: {command}")


def main(argv: Sequence[str] | None = None) -> int:
    """Run the CLI and return its contract exit status."""
    parser = build_parser()
    raw_arguments = list(argv) if argv is not None else sys.argv[1:]
    if not raw_arguments:
        parser.print_help()
        return ExitCode.OK
    use_json = "--json" in raw_arguments
    try:
        arguments = parser.parse_args(raw_arguments)
        return _run_command(arguments)
    except MuraFlashError as error:
        if use_json:
            _print_json(
                {
                    "error": {
                        "code": _error_name(error),
                        "message": error.message,
                    }
                },
                stream=sys.stderr,
            )
        else:
            print(f"mura-flash: error: {error.message}", file=sys.stderr)
        return error.exit_code
