"""Strict JSON loading helpers."""

from __future__ import annotations

import json
import math
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

    def finite_float(value: str) -> float:
        result = float(value)
        if not math.isfinite(result):
            raise ValueError(f"non-finite JSON number: {value}")
        return result

    return json.loads(
        text,
        object_pairs_hook=_reject_duplicate_keys,
        parse_constant=reject_constant,
        parse_float=finite_float,
    )


def load_strict_json(path: Path) -> Any:
    """Read and strictly decode one UTF-8 JSON file."""
    return loads_strict_json(path.read_text(encoding="utf-8"))


def canonical_json(value: object) -> str:
    """Serialize exactly as required by the v1 canonical JSON contract."""
    try:
        result = json.dumps(
            value,
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        result.encode("utf-8")
    except (UnicodeEncodeError, ValueError) as error:
        raise ValueError(f"value is not canonical JSON: {error}") from error
    return result
