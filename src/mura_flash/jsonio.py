"""Strict JSON loading helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class DuplicateKeyError(ValueError):
    """A JSON object contains a duplicate member name."""


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate object key: {key!r}")
        result[key] = value
    return result


def loads_strict_json(text: str) -> Any:
    """Decode JSON while rejecting duplicate object keys and non-standard numbers."""

    def reject_constant(value: str) -> None:
        raise ValueError(f"invalid JSON number: {value}")

    return json.loads(
        text,
        object_pairs_hook=_reject_duplicate_keys,
        parse_constant=reject_constant,
    )


def load_strict_json(path: Path) -> Any:
    """Read and strictly decode one UTF-8 JSON file."""
    return loads_strict_json(path.read_text(encoding="utf-8"))
