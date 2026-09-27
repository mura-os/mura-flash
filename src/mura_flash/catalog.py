"""Recipe catalog loading."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from importlib.resources.abc import Traversable
from pathlib import Path
from types import MappingProxyType
from typing import Any, cast

from mura_flash.errors import RecipeInvalidError
from mura_flash.jsonio import loads_strict_json
from mura_flash.resources import PACKAGE_ROOT, source_data_path
from mura_flash.validation import JsonObject, load_contract, validate_recipe


@dataclass(frozen=True, slots=True)
class Catalog:
    """An immutable validated target catalog."""

    recipes: Mapping[str, JsonObject]

    def get(self, target_id: str) -> JsonObject:
        """Return a target or raise a presentation-ready error."""
        try:
            return self.recipes[target_id]
        except KeyError as error:
            raise RecipeInvalidError(f"unknown target: {target_id}") from error


def _source_files(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    target_path = path / "targets"
    directory = target_path if target_path.is_dir() else path
    return sorted(
        candidate
        for candidate in directory.glob("*.json")
        if not candidate.name.endswith(".schema.json")
    )


def _packaged_files() -> list[Traversable]:
    directory = PACKAGE_ROOT.joinpath("data", "recipes", "targets")
    return sorted(
        (entry for entry in directory.iterdir() if entry.name.endswith(".json")),
        key=lambda entry: entry.name,
    )


def _decode_candidates(
    candidates: Iterable[Path | Traversable],
    *,
    enforce_filenames: bool,
) -> tuple[dict[str, JsonObject], list[str]]:
    recipes: dict[str, JsonObject] = {}
    errors: list[str] = []
    for candidate in candidates:
        label = str(candidate)
        try:
            decoded: Any = loads_strict_json(candidate.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, ValueError) as error:
            errors.append(f"{label}: {error}")
            continue
        issues = validate_recipe(decoded)
        if issues:
            errors.extend(f"{label}: {issue.render()}" for issue in issues)
            continue
        recipe = cast("JsonObject", decoded)
        recipe_id = cast("str", recipe["id"])
        if enforce_filenames and candidate.name != f"{recipe_id}.json":
            errors.append(f"{label}: filename must be {recipe_id}.json for target {recipe_id!r}")
        if recipe_id in recipes:
            errors.append(f"{label}: duplicate target id: {recipe_id!r}")
        else:
            recipes[recipe_id] = recipe
    return recipes, errors


def load_catalog(path: Path | None = None, *, require_complete: bool = True) -> Catalog:
    """Load a strict, semantically validated catalog."""
    if path is None:
        source = source_data_path("recipes/targets")
        candidates: Iterable[Path | Traversable] = (
            _source_files(source) if source is not None else _packaged_files()
        )
        enforce_filenames = True
    else:
        if not path.exists():
            raise RecipeInvalidError(f"path does not exist: {path}")
        candidates = _source_files(path)
        enforce_filenames = path.is_dir()

    recipes, errors = _decode_candidates(
        candidates,
        enforce_filenames=enforce_filenames,
    )
    if require_complete:
        expected = set(cast("list[str]", load_contract()["targetIds"]))
        actual = set(recipes)
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        if missing:
            errors.append(f"catalog is missing targets: {', '.join(missing)}")
        if extra:
            errors.append(f"catalog has unexpected targets: {', '.join(extra)}")
    if errors:
        raise RecipeInvalidError("\n".join(errors))
    return Catalog(MappingProxyType(recipes))
