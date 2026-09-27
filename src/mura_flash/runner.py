"""Safe subprocess execution boundary."""

from __future__ import annotations

import os
import selectors
import subprocess
import time
from dataclasses import dataclass
from typing import IO, Final, Protocol, cast

from mura_flash.errors import ProbeFailedError, ProbeTimeoutError, SafetyRefusalError
from mura_flash.probes import ALLOWED_GETPROPS, ALLOWED_GETVARS

PROBE_TIMEOUT_SECONDS: Final = 10
MAX_OUTPUT_BYTES: Final = 1_048_576


@dataclass(frozen=True, slots=True)
class CommandResult:
    """Captured output from one allowlisted process."""

    argv: tuple[str, ...]
    returncode: int
    stdout: bytes = b""
    stderr: bytes = b""


class Runner(Protocol):
    """Injectable command runner used by inspection."""

    def run(
        self,
        argv: tuple[str, ...],
        *,
        timeout: int = PROBE_TIMEOUT_SECONDS,
        max_output: int = MAX_OUTPUT_BYTES,
    ) -> CommandResult:
        """Run one command and return bounded byte output."""


def _valid_serial(serial: str) -> bool:
    return bool(serial) and not serial.startswith("-") and "\x00" not in serial


def ensure_allowlisted(argv: tuple[str, ...]) -> None:
    """Refuse every command shape outside the compiled-in read-only policy."""
    if argv in {
        ("adb", "version"),
        ("adb", "devices"),
        ("fastboot", "--version"),
        ("fastboot", "devices"),
    }:
        return
    if (
        len(argv) == 6
        and argv[0] == "adb"
        and argv[1] == "-s"
        and _valid_serial(argv[2])
        and argv[3:5] == ("shell", "getprop")
        and argv[5] in ALLOWED_GETPROPS
    ):
        return
    if (
        len(argv) == 5
        and argv[0] == "fastboot"
        and argv[1] == "-s"
        and _valid_serial(argv[2])
        and argv[3] == "getvar"
        and argv[4] in ALLOWED_GETVARS
        and argv[4] != "all"
    ):
        return
    raise SafetyRefusalError("command is outside the compiled-in read-only allowlist")


class SubprocessRunner:
    """Execute allowlisted commands without a shell."""

    @staticmethod
    def _capture_bounded(
        process: subprocess.Popen[bytes],
        *,
        timeout: int,
        max_output: int,
        tool: str,
    ) -> tuple[bytes, bytes]:
        if process.stdout is None or process.stderr is None:
            process.kill()
            raise ProbeFailedError(f"cannot capture {tool} output")
        streams: tuple[IO[bytes], IO[bytes]] = (process.stdout, process.stderr)
        chunks: dict[IO[bytes], bytearray] = {
            process.stdout: bytearray(),
            process.stderr: bytearray(),
        }
        total = 0
        deadline = time.monotonic() + timeout
        with selectors.DefaultSelector() as selector:
            for stream in streams:
                selector.register(stream, selectors.EVENT_READ)
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    process.kill()
                    process.communicate()
                    raise ProbeTimeoutError(f"{tool} timed out after {timeout} seconds")
                events = selector.select(remaining)
                if not events:
                    process.kill()
                    process.communicate()
                    raise ProbeTimeoutError(f"{tool} timed out after {timeout} seconds")
                for key, _mask in events:
                    stream = cast(IO[bytes], key.fileobj)
                    data = os.read(stream.fileno(), min(65_536, max_output - total + 1))
                    if not data:
                        selector.unregister(stream)
                        continue
                    chunks[stream].extend(data)
                    total += len(data)
                    if total > max_output:
                        process.kill()
                        for pipe in streams:
                            pipe.close()
                        process.wait()
                        raise ProbeFailedError(
                            f"{tool} output exceeded the {max_output}-byte limit"
                        )
        remaining = deadline - time.monotonic()
        try:
            process.wait(timeout=max(0, remaining))
        except subprocess.TimeoutExpired as error:
            process.kill()
            process.wait()
            raise ProbeTimeoutError(f"{tool} timed out after {timeout} seconds") from error
        return bytes(chunks[process.stdout]), bytes(chunks[process.stderr])

    def run(
        self,
        argv: tuple[str, ...],
        *,
        timeout: int = PROBE_TIMEOUT_SECONDS,
        max_output: int = MAX_OUTPUT_BYTES,
    ) -> CommandResult:
        """Run an argument array under the fixed locale and resource limits."""
        ensure_allowlisted(argv)
        environment = os.environ.copy()
        environment["LC_ALL"] = "C"
        try:
            process = subprocess.Popen(
                list(argv),
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=environment,
                shell=False,
            )
        except OSError as error:
            raise ProbeFailedError(f"cannot execute {argv[0]}: {error}") from error
        try:
            stdout, stderr = self._capture_bounded(
                process,
                timeout=timeout,
                max_output=max_output,
                tool=argv[0],
            )
        except OSError as error:
            process.kill()
            process.wait()
            raise ProbeFailedError(f"cannot read {argv[0]} output: {error}") from error
        return CommandResult(argv, process.returncode, stdout, stderr)
