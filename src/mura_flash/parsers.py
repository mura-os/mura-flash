"""Strict parsers for the small accepted host-tool output surface."""

from __future__ import annotations

import re

from mura_flash.errors import ProbeFailedError

_ADB_VERSION = re.compile(r"Android Debug Bridge version 1\.0\.\d+")
_ADB_PLATFORM_VERSION = re.compile(r"Version [0-9][0-9A-Za-z.+~-]*")
_FASTBOOT_VERSION = re.compile(r"fastboot version ([0-9][0-9A-Za-z.+~-]*)")
_INSTALLED_AS = re.compile(r"Installed as .+")
_RUNNING_ON = re.compile(r"Running on .+")
_FASTBOOT_FINISHED = re.compile(r"Finished\. Total time: [0-9.]+s")


def decode_output(data: bytes, tool: str) -> str:
    """Decode tool output as strict UTF-8 and reject NULs."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ProbeFailedError(f"{tool} emitted non-UTF-8 output") from error
    if "\x00" in text:
        raise ProbeFailedError(f"{tool} emitted a NUL byte")
    return text.replace("\r\n", "\n")


def parse_adb_version(stdout: bytes, stderr: bytes) -> str:
    """Validate canonical `adb version` output and return the platform version."""
    if stderr:
        raise ProbeFailedError("adb version wrote unexpected stderr")
    lines = decode_output(stdout, "adb").rstrip("\n").split("\n")
    if len(lines) < 2 or _ADB_VERSION.fullmatch(lines[0]) is None:
        raise ProbeFailedError("unrecognized adb version output")
    if _ADB_PLATFORM_VERSION.fullmatch(lines[1]) is None:
        raise ProbeFailedError("unrecognized adb platform version")
    if any(
        _INSTALLED_AS.fullmatch(line) is None and _RUNNING_ON.fullmatch(line) is None
        for line in lines[2:]
    ):
        raise ProbeFailedError("unrecognized adb version detail")
    return lines[1].removeprefix("Version ")


def parse_fastboot_version(stdout: bytes, stderr: bytes) -> str:
    """Validate canonical `fastboot --version` output and return its version."""
    if stderr:
        raise ProbeFailedError("fastboot version wrote unexpected stderr")
    lines = decode_output(stdout, "fastboot").rstrip("\n").split("\n")
    if not lines:
        raise ProbeFailedError("empty fastboot version output")
    match = _FASTBOOT_VERSION.fullmatch(lines[0])
    if match is None or any(_INSTALLED_AS.fullmatch(line) is None for line in lines[1:]):
        raise ProbeFailedError("unrecognized fastboot version output")
    return match.group(1)


def parse_adb_devices(stdout: bytes, stderr: bytes) -> list[str]:
    """Parse only the stable long-standing `adb devices` table."""
    if stderr:
        raise ProbeFailedError("adb devices wrote unexpected stderr")
    lines = decode_output(stdout, "adb").rstrip("\n").split("\n")
    if not lines or lines[0] != "List of devices attached":
        raise ProbeFailedError("unrecognized adb devices output")
    devices: list[str] = []
    for line in lines[1:]:
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) != 2 or not fields[0] or fields[1] != "device":
            raise ProbeFailedError("adb device enumeration contained an invalid record")
        if fields[0] in devices:
            raise ProbeFailedError("adb device enumeration contained a duplicate record")
        devices.append(fields[0])
    return devices


def parse_fastboot_devices(stdout: bytes, stderr: bytes) -> list[str]:
    """Parse only `SERIAL<TAB>fastboot` device records."""
    if stderr:
        raise ProbeFailedError("fastboot devices wrote unexpected stderr")
    text = decode_output(stdout, "fastboot").rstrip("\n")
    if not text:
        return []
    devices: list[str] = []
    for line in text.split("\n"):
        fields = line.split("\t")
        if len(fields) != 2 or not fields[0] or fields[1] != "fastboot":
            raise ProbeFailedError("fastboot device enumeration contained an invalid record")
        if fields[0] in devices:
            raise ProbeFailedError("fastboot device enumeration contained a duplicate record")
        devices.append(fields[0])
    return devices


def parse_getprop(stdout: bytes, stderr: bytes) -> str:
    """Parse one property value with no shell diagnostics or extra lines."""
    if stderr:
        raise ProbeFailedError("getprop wrote unexpected stderr")
    text = decode_output(stdout, "adb").rstrip("\n")
    if "\n" in text:
        raise ProbeFailedError("getprop emitted more than one line")
    return text


def parse_getvar(variable: str, stdout: bytes, stderr: bytes) -> str:
    """Parse one requested fastboot variable and known completion diagnostics."""
    text = decode_output(stdout + stderr, "fastboot").rstrip("\n")
    prefix = f"{variable}:"
    bootloader_prefix = f"(bootloader) {variable}:"
    value: str | None = None
    for line in text.split("\n"):
        if line.startswith(prefix):
            candidate = line.removeprefix(prefix).strip()
        elif line.startswith(bootloader_prefix):
            candidate = line.removeprefix(bootloader_prefix).strip()
        elif not line or _FASTBOOT_FINISHED.fullmatch(line) is not None:
            continue
        else:
            raise ProbeFailedError(f"unrecognized fastboot getvar output: {line!r}")
        if value is not None:
            raise ProbeFailedError(f"fastboot returned {variable!r} more than once")
        value = candidate
    if value is None:
        raise ProbeFailedError(f"fastboot did not return {variable!r}")
    return value
