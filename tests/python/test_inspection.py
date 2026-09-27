from __future__ import annotations

import copy
from collections import deque
from collections.abc import Callable

import pytest

from mura_flash.catalog import load_catalog
from mura_flash.errors import (
    DeviceAmbiguousError,
    DeviceMissingError,
    ProbeFailedError,
)
from mura_flash.inspection import Inspector
from mura_flash.parsers import parse_adb_devices, parse_fastboot_devices
from mura_flash.runner import (
    MAX_OUTPUT_BYTES,
    PROBE_TIMEOUT_SECONDS,
    CommandResult,
)


class FakeRunner:
    def __init__(self, results: list[CommandResult]) -> None:
        self.results = deque(results)
        self.calls: list[tuple[str, ...]] = []
        self.max_outputs: list[int] = []

    def run(
        self,
        argv: tuple[str, ...],
        *,
        timeout: int = PROBE_TIMEOUT_SECONDS,
        max_output: int = MAX_OUTPUT_BYTES,
    ) -> CommandResult:
        assert timeout == 10
        assert 0 < max_output <= MAX_OUTPUT_BYTES
        self.calls.append(argv)
        self.max_outputs.append(max_output)
        result = self.results.popleft()
        assert result.argv == argv
        return result


def adb_result(
    argv: tuple[str, ...],
    stdout: bytes = b"",
    stderr: bytes = b"",
    returncode: int = 0,
) -> CommandResult:
    return CommandResult(argv, returncode, stdout, stderr)


def test_adb_inspection_uses_explicit_serial_and_redacts_transcript() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-3-eureka"])
    recipe["probes"] = ["adb.model"]
    recipe["redactFacts"] = ["model"]
    commands = [
        adb_result(
            ("adb", "version"),
            b"Android Debug Bridge version 1.0.41\nVersion 35.0.2-android-tools\n",
        ),
        adb_result(("adb", "devices"), b"List of devices attached\nserial-1\tdevice\n\n"),
        adb_result(
            ("adb", "-s", "serial-1", "shell", "getprop", "ro.product.model"),
            b"Secret Model\n",
        ),
    ]
    runner = FakeRunner(commands)

    inspection = Inspector(runner).inspect(recipe, "adb")

    assert inspection.facts == {"model": "<redacted>"}
    assert inspection.serial == "<redacted>"
    transcript = inspection.transcript.to_jsonl()
    assert "serial-1" not in transcript
    assert "Secret Model" not in transcript
    assert transcript.count("\n") == 3
    assert runner.max_outputs == [
        MAX_OUTPUT_BYTES,
        MAX_OUTPUT_BYTES - len(commands[0].stdout),
        MAX_OUTPUT_BYTES - len(commands[0].stdout) - len(commands[1].stdout),
    ]


def test_fastboot_inspection_parses_stderr_getvar() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-2-hollywood"])
    recipe["probes"] = ["fastboot.bootloader-version"]
    recipe["redactFacts"] = []
    commands = [
        adb_result(("fastboot", "--version"), b"fastboot version 35.0.2\n"),
        adb_result(("fastboot", "devices"), b"FB123\tfastboot\n"),
        adb_result(
            ("fastboot", "-s", "FB123", "getvar", "version-bootloader"),
            stderr=b"(bootloader) version-bootloader: 1.2.3\nFinished. Total time: 0.001s\n",
        ),
    ]

    inspection = Inspector(FakeRunner(commands)).inspect(recipe, "fastboot", serial="FB123")

    assert inspection.facts == {"bootloader-version": "1.2.3"}


def test_missing_and_ambiguous_devices_are_distinct_failures() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-3-eureka"])
    recipe["probes"] = []
    missing = FakeRunner(
        [
            adb_result(
                ("adb", "version"),
                b"Android Debug Bridge version 1.0.41\nVersion 35.0.2\n",
            ),
            adb_result(("adb", "devices"), b"List of devices attached\n\n"),
        ]
    )
    with pytest.raises(DeviceMissingError):
        Inspector(missing).inspect(recipe, "adb")

    ambiguous = FakeRunner(
        [
            adb_result(
                ("adb", "version"),
                b"Android Debug Bridge version 1.0.41\nVersion 35.0.2\n",
            ),
            adb_result(
                ("adb", "devices"),
                b"List of devices attached\none\tdevice\ntwo\tdevice\n",
            ),
        ]
    )
    with pytest.raises(DeviceAmbiguousError):
        Inspector(ambiguous).inspect(recipe, "adb")


def test_explicit_serial_does_not_bypass_one_device_limit() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-3-eureka"])
    recipe["probes"] = []
    serial = "requested-private-serial"
    runner = FakeRunner(
        [
            adb_result(
                ("adb", "version"),
                b"Android Debug Bridge version 1.0.41\nVersion 35.0.2\n",
            ),
            adb_result(
                ("adb", "devices"),
                f"List of devices attached\n{serial}\tdevice\nother\tdevice\n".encode(),
            ),
        ]
    )

    with pytest.raises(DeviceAmbiguousError) as caught:
        Inspector(runner).inspect(recipe, "adb", serial=serial)

    assert serial not in caught.value.message


@pytest.mark.parametrize(
    ("parser", "output"),
    [
        (
            parse_adb_devices,
            b"List of devices attached\nprivate-serial\toffline\n",
        ),
        (
            parse_adb_devices,
            b"List of devices attached\nprivate-serial\tdevice\nprivate-serial\tdevice\n",
        ),
        (
            parse_fastboot_devices,
            b"private-serial\tunknown\n",
        ),
        (
            parse_fastboot_devices,
            b"private-serial\tfastboot\nprivate-serial\tfastboot\n",
        ),
    ],
)
def test_device_parse_errors_do_not_disclose_records(
    parser: Callable[[bytes, bytes], list[str]],
    output: bytes,
) -> None:
    with pytest.raises(ProbeFailedError) as caught:
        parser(output, b"")

    assert "private-serial" not in caught.value.message


def test_injected_runner_cannot_bypass_output_limit() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-3-eureka"])
    recipe["probes"] = []
    runner = FakeRunner(
        [
            adb_result(("adb", "version"), b"x" * (MAX_OUTPUT_BYTES + 1)),
        ]
    )
    with pytest.raises(ProbeFailedError, match="output exceeded"):
        Inspector(runner).inspect(recipe, "adb")
