"""Access packaged data with a source-tree fallback for development."""

from __future__ import annotations

from importlib.resources import files
from pathlib import Path
from typing import Final

PACKAGE_ROOT: Final = files("mura_flash")
SOURCE_ROOT: Final = Path(__file__).resolve().parents[2]


def read_data_text(relative: str) -> str:
    """Read packaged data, preferring live source data when it exists."""
    source_path = SOURCE_ROOT / relative
    if source_path.is_file():
        return source_path.read_text(encoding="utf-8")
    return PACKAGE_ROOT.joinpath("data", *relative.split("/")).read_text(encoding="utf-8")


def source_data_path(relative: str) -> Path | None:
    """Return a live source data path when running from a checkout."""
    path = SOURCE_ROOT / relative
    return path if path.exists() else None
