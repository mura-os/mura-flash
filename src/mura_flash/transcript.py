"""Redacted JSON Lines command transcripts."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from mura_flash.runner import CommandResult

REDACTION = "<redacted>"


@dataclass(slots=True)
class Transcript:
    """Ordered command records with identifier and fact redaction."""

    _records: list[dict[str, object]] = field(default_factory=list)
    _secrets: set[str] = field(default_factory=set)

    def add_secret(self, value: str) -> None:
        """Mark a non-empty value for replacement in every record."""
        if value:
            self._secrets.add(value)
            for record in self._records:
                self._redact_record(record, value)

    @staticmethod
    def _redact_record(record: dict[str, object], secret: str) -> None:
        argv = record["argv"]
        if isinstance(argv, list):
            record["argv"] = [
                item.replace(secret, REDACTION) if isinstance(item, str) else item for item in argv
            ]
        for key in ("stdout", "stderr"):
            value = record[key]
            if isinstance(value, str):
                record[key] = value.replace(secret, REDACTION)

    def append(self, result: CommandResult) -> None:
        """Append one command result, applying all known redactions."""
        record: dict[str, object] = {
            "argv": list(result.argv),
            "exitCode": result.returncode,
            "stdout": result.stdout.decode("utf-8", errors="replace"),
            "stderr": result.stderr.decode("utf-8", errors="replace"),
        }
        for secret in self._secrets:
            self._redact_record(record, secret)
        self._records.append(record)

    @property
    def records(self) -> tuple[dict[str, object], ...]:
        """Return detached transcript records."""
        return tuple(dict(record) for record in self._records)

    def to_jsonl(self) -> str:
        """Serialize one compact JSON object per line."""
        return "".join(
            f"{json.dumps(record, sort_keys=True, separators=(',', ':'))}\n"
            for record in self._records
        )
