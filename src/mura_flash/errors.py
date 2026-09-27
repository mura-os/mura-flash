"""Domain errors and contract exit codes."""

from __future__ import annotations

from enum import IntEnum


class ExitCode(IntEnum):
    """Stable process exit codes from the v0 contract."""

    OK = 0
    USAGE = 2
    RECIPE_INVALID = 2
    DEVICE_MISSING = 3
    DEVICE_AMBIGUOUS = 3
    PROBE_FAILED = 4
    PROBE_TIMEOUT = 4
    SAFETY_REFUSAL = 5


class MuraFlashError(Exception):
    """An expected error suitable for presentation by the CLI."""

    def __init__(self, message: str, exit_code: ExitCode) -> None:
        super().__init__(message)
        self.message = message
        self.exit_code = exit_code


class RecipeInvalidError(MuraFlashError):
    """A recipe or catalog failed validation."""

    def __init__(self, message: str) -> None:
        super().__init__(message, ExitCode.RECIPE_INVALID)


class DeviceMissingError(MuraFlashError):
    """No matching device is available."""

    def __init__(self, message: str = "no matching device found") -> None:
        super().__init__(message, ExitCode.DEVICE_MISSING)


class DeviceAmbiguousError(MuraFlashError):
    """More than one device is available without an explicit selection."""

    def __init__(self, message: str = "multiple devices found; pass --serial") -> None:
        super().__init__(message, ExitCode.DEVICE_AMBIGUOUS)


class ProbeFailedError(MuraFlashError):
    """A read-only probe or host tool failed."""

    def __init__(self, message: str) -> None:
        super().__init__(message, ExitCode.PROBE_FAILED)


class ProbeTimeoutError(MuraFlashError):
    """A host tool exceeded the contract timeout."""

    def __init__(self, message: str) -> None:
        super().__init__(message, ExitCode.PROBE_TIMEOUT)


class SafetyRefusalError(MuraFlashError):
    """An operation was rejected by the compiled-in safety policy."""

    def __init__(self, message: str) -> None:
        super().__init__(message, ExitCode.SAFETY_REFUSAL)
