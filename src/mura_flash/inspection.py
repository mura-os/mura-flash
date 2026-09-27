"""Read-only target inspection orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, cast

from mura_flash.errors import (
    DeviceAmbiguousError,
    DeviceMissingError,
    ProbeFailedError,
    RecipeInvalidError,
)
from mura_flash.parsers import (
    parse_adb_devices,
    parse_adb_version,
    parse_fastboot_devices,
    parse_fastboot_version,
    parse_getprop,
    parse_getvar,
)
from mura_flash.probes import ADB_GETPROP, FASTBOOT_GETVAR
from mura_flash.runner import (
    MAX_OUTPUT_BYTES,
    PROBE_TIMEOUT_SECONDS,
    CommandResult,
    Runner,
    ensure_allowlisted,
)
from mura_flash.transcript import REDACTION, Transcript
from mura_flash.validation import JsonObject, load_contract, validate_recipe

Transport = Literal["adb", "fastboot"]


@dataclass(frozen=True, slots=True)
class Inspection:
    """Collected facts, a redacted serial placeholder, and a redacted transcript."""

    target: str
    transport: Transport
    serial: str
    tool_version: str
    facts: dict[str, str]
    transcript: Transcript


class Inspector:
    """Collect contract facts through an injected command runner."""

    def __init__(self, runner: Runner) -> None:
        self._runner = runner

    def _run(
        self,
        argv: tuple[str, ...],
        transcript: Transcript,
        remaining_output: int,
    ) -> tuple[CommandResult, int]:
        if remaining_output <= 0:
            raise ProbeFailedError(f"cumulative output reached the {MAX_OUTPUT_BYTES}-byte limit")
        ensure_allowlisted(argv)
        result = self._runner.run(
            argv,
            timeout=PROBE_TIMEOUT_SECONDS,
            max_output=remaining_output,
        )
        if result.argv != argv:
            raise ProbeFailedError("runner returned a result for a different command")
        output_size = len(result.stdout) + len(result.stderr)
        if output_size > remaining_output:
            raise ProbeFailedError(
                f"{argv[0]} output exceeded the cumulative {MAX_OUTPUT_BYTES}-byte limit"
            )
        transcript.append(result)
        return result, remaining_output - output_size

    @staticmethod
    def _require_success(result: CommandResult, action: str) -> None:
        if result.returncode != 0:
            raise ProbeFailedError(f"{action} failed with exit status {result.returncode}")

    @staticmethod
    def _select_device(devices: list[str], requested: str | None) -> str:
        if len(devices) > 1:
            raise DeviceAmbiguousError("multiple devices found")
        if requested is not None:
            if requested not in devices:
                raise DeviceMissingError()
            return requested
        if not devices:
            raise DeviceMissingError()
        return devices[0]

    def inspect(
        self,
        recipe: JsonObject,
        transport: Transport,
        *,
        serial: str | None = None,
    ) -> Inspection:
        """Inspect one validated recipe over one selected transport."""
        issues = validate_recipe(recipe)
        if issues:
            raise RecipeInvalidError("\n".join(issue.render() for issue in issues))
        transports = cast("list[str]", recipe["transports"])
        if transport not in transports:
            raise RecipeInvalidError(
                f"target {recipe['id']!r} does not declare transport {transport!r}"
            )

        transcript = Transcript()
        remaining_output = MAX_OUTPUT_BYTES
        if transport == "adb":
            version_result, remaining_output = self._run(
                ("adb", "version"), transcript, remaining_output
            )
            self._require_success(version_result, "adb version check")
            tool_version = parse_adb_version(version_result.stdout, version_result.stderr)
            devices_result, remaining_output = self._run(
                ("adb", "devices"), transcript, remaining_output
            )
            self._require_success(devices_result, "adb device enumeration")
            devices = parse_adb_devices(devices_result.stdout, devices_result.stderr)
        else:
            version_result, remaining_output = self._run(
                ("fastboot", "--version"), transcript, remaining_output
            )
            self._require_success(version_result, "fastboot version check")
            tool_version = parse_fastboot_version(version_result.stdout, version_result.stderr)
            devices_result, remaining_output = self._run(
                ("fastboot", "devices"), transcript, remaining_output
            )
            self._require_success(devices_result, "fastboot device enumeration")
            devices = parse_fastboot_devices(devices_result.stdout, devices_result.stderr)

        selected = self._select_device(devices, serial)
        for device in devices:
            transcript.add_secret(device)

        specs = {
            cast("str", spec["id"]): spec
            for spec in cast("list[dict[str, Any]]", load_contract()["probeIds"])
        }
        redact_facts = set(cast("list[str]", recipe["redactFacts"]))
        facts: dict[str, str] = {}
        for probe_id in cast("list[str]", recipe["probes"]):
            spec = specs[probe_id]
            if spec["transport"] != transport:
                continue
            fact = cast("str", spec["fact"])
            argv: tuple[str, ...]
            if transport == "adb":
                prop = ADB_GETPROP.get(probe_id)
                if prop is None:
                    raise RecipeInvalidError(f"no compiled-in command for {probe_id!r}")
                argv = ("adb", "-s", selected, "shell", "getprop", prop)
                result, remaining_output = self._run(argv, transcript, remaining_output)
                self._require_success(result, f"probe {probe_id}")
                value = parse_getprop(result.stdout, result.stderr)
            else:
                variable = FASTBOOT_GETVAR.get(probe_id)
                if variable is None:
                    raise RecipeInvalidError(f"no compiled-in command for {probe_id!r}")
                argv = ("fastboot", "-s", selected, "getvar", variable)
                result, remaining_output = self._run(argv, transcript, remaining_output)
                self._require_success(result, f"probe {probe_id}")
                value = parse_getvar(variable, result.stdout, result.stderr)
            sensitive = fact in redact_facts or spec.get("sensitive") is True
            facts[fact] = REDACTION if sensitive else value
            if sensitive:
                transcript.add_secret(value)

        return Inspection(
            target=cast("str", recipe["id"]),
            transport=transport,
            serial=REDACTION,
            tool_version=tool_version,
            facts=facts,
            transcript=transcript,
        )
