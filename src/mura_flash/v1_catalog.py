"""Validated target and install-procedure catalogs for v1."""

from __future__ import annotations

import hashlib
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from importlib.resources.abc import Traversable
from pathlib import Path
from types import MappingProxyType
from typing import cast

from mura_flash.errors import RecipeInvalidError
from mura_flash.jsonio import canonical_json
from mura_flash.resources import PACKAGE_ROOT, source_data_path
from mura_flash.v1_validation import (
    decode_v1_document,
    load_operation_registry,
    validate_catalog_closure,
    validate_procedure_graph,
)
from mura_flash.validation import JsonObject


@dataclass(frozen=True, slots=True)
class TargetCatalog:
    """Immutable v1 target records keyed by target ID."""

    targets: Mapping[str, JsonObject]
    index: JsonObject | None = None

    def get(self, target_id: str) -> JsonObject:
        try:
            return self.targets[target_id]
        except KeyError as error:
            raise RecipeInvalidError(f"unknown v1 target: {target_id}") from error


@dataclass(frozen=True, slots=True)
class ProcedureCatalog:
    """Immutable v1 install procedures keyed by procedure ID."""

    procedures: Mapping[str, JsonObject]
    index: JsonObject | None = None

    def get(self, procedure_id: str) -> JsonObject:
        try:
            return self.procedures[procedure_id]
        except KeyError as error:
            raise RecipeInvalidError(f"unknown procedure: {procedure_id}") from error

    def for_target(self, target_id: str) -> tuple[JsonObject, ...]:
        return tuple(
            procedure
            for _, procedure in sorted(self.procedures.items())
            if procedure["targetId"] == target_id
        )


def _source_candidates(path: Path, subdirectory: str) -> list[Path]:
    if path.is_file():
        return [path]
    nested = path / subdirectory
    directory = nested if nested.is_dir() else path
    return sorted(
        candidate
        for candidate in directory.glob("*.json")
        if not candidate.name.endswith(".schema.json")
        and candidate.name not in {"index.json", "index-v1.json"}
    )


def _packaged_candidates(relative: str) -> list[Traversable]:
    directory = PACKAGE_ROOT.joinpath("data", *relative.split("/"))
    if not directory.is_dir():
        return []
    return sorted(
        (
            entry
            for entry in directory.iterdir()
            if entry.name.endswith(".json") and not entry.name.endswith(".schema.json")
        ),
        key=lambda entry: entry.name,
    )


def _candidates(
    path: Path | None,
    *,
    relative: str,
    subdirectory: str,
) -> tuple[Iterable[Path | Traversable], bool]:
    if path is not None:
        if not path.exists():
            raise RecipeInvalidError(f"path does not exist: {path}")
        return _source_candidates(path, subdirectory), path.is_dir()
    source = source_data_path(relative)
    if source is not None:
        return _source_candidates(source, subdirectory), True
    return _packaged_candidates(relative), True


def _load_documents(
    candidates: Iterable[Path | Traversable],
    *,
    schema: str,
    enforce_filenames: bool,
) -> dict[str, JsonObject]:
    documents: dict[str, JsonObject] = {}
    errors: list[str] = []
    for candidate in candidates:
        try:
            document = decode_v1_document(candidate.read_text(encoding="utf-8"), schema)
        except (OSError, UnicodeError, RecipeInvalidError) as error:
            message = error.message if isinstance(error, RecipeInvalidError) else str(error)
            errors.append(f"{candidate}: {message}")
            continue
        identifier = cast("str", document["id"])
        if enforce_filenames and candidate.name != f"{identifier}.json":
            errors.append(f"{candidate}: filename must be {identifier}.json")
        if identifier in documents:
            errors.append(f"{candidate}: duplicate document id: {identifier!r}")
        else:
            documents[identifier] = document
    if errors:
        raise RecipeInvalidError("\n".join(errors))
    return documents


def _load_default_index() -> JsonObject:
    source_index = source_data_path("catalog/index-v1.json")
    packaged_index = PACKAGE_ROOT.joinpath("data", "catalog", "index-v1.json")
    try:
        if source_index is not None and source_index.is_file():
            index_text = source_index.read_text(encoding="utf-8")
        else:
            index_text = packaged_index.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise RecipeInvalidError(f"unable to load v1 catalog index: {error}") from error
    return decode_v1_document(
        index_text,
        "org.mura.flash.target-catalog-index/v1",
    )


def _verify_index_entries(
    index: JsonObject,
    collection: str,
    documents: Mapping[str, JsonObject],
) -> None:
    entries = cast("list[JsonObject]", index[collection])
    ids = [cast("str", entry["id"]) for entry in entries]
    if ids != sorted(ids) or len(ids) != len(set(ids)):
        raise RecipeInvalidError(f"{collection} index IDs must be unique and sorted")
    if set(ids) != set(documents):
        raise RecipeInvalidError(f"{collection} index does not match loaded document IDs")
    directory = "catalog/targets" if collection == "targets" else "recipes/procedures"
    for entry in entries:
        identifier = cast("str", entry["id"])
        expected_path = f"{directory}/{identifier}.json"
        if entry["path"] != expected_path:
            raise RecipeInvalidError(f"{collection} index path mismatch for {identifier!r}")
        encoded = canonical_json(documents[identifier]).encode("utf-8")
        if entry["canonicalSize"] != len(encoded):
            raise RecipeInvalidError(f"{collection} index size mismatch for {identifier!r}")
        digest = hashlib.sha256(encoded).hexdigest()
        if entry["sha256"] != digest:
            raise RecipeInvalidError(f"{collection} index digest mismatch for {identifier!r}")


def load_target_catalog(path: Path | None = None) -> TargetCatalog:
    """Load strict v1 target records from a file, directory, source tree, or wheel."""
    candidates, enforce_filenames = _candidates(
        path,
        relative="catalog/targets",
        subdirectory="targets",
    )
    targets = _load_documents(
        candidates,
        schema="org.mura.flash.target-record/v1",
        enforce_filenames=enforce_filenames,
    )
    index: JsonObject | None = None
    if path is None:
        index = _load_default_index()
        _verify_index_entries(index, "targets", targets)
    return TargetCatalog(MappingProxyType(targets), index)


def load_procedure_catalog(
    path: Path | None = None,
    *,
    target_catalog: TargetCatalog | None = None,
) -> ProcedureCatalog:
    """Load and graph-validate strict v1 procedure documents."""
    candidates, enforce_filenames = _candidates(
        path,
        relative="recipes/procedures",
        subdirectory="procedures",
    )
    procedures = _load_documents(
        candidates,
        schema="org.mura.flash.install-procedure/v1",
        enforce_filenames=enforce_filenames,
    )
    target_ids = set(target_catalog.targets) if target_catalog is not None else None
    registry = load_operation_registry()
    errors: list[str] = []
    for procedure_id, procedure in sorted(procedures.items()):
        issues = validate_procedure_graph(
            procedure,
            registry,
            target_ids=target_ids,
        )
        errors.extend(f"{procedure_id}: {issue.render()}" for issue in issues)
    if errors:
        raise RecipeInvalidError("\n".join(errors))
    index: JsonObject | None = None
    if path is None:
        index = _load_default_index()
        _verify_index_entries(index, "procedures", procedures)
    return ProcedureCatalog(MappingProxyType(procedures), index)


def load_v1_catalogs(
    *,
    target_path: Path | None = None,
    procedure_path: Path | None = None,
    require_closure: bool = True,
) -> tuple[TargetCatalog, ProcedureCatalog]:
    """Load both v1 catalogs and optionally require exact cross-document closure."""
    targets = load_target_catalog(target_path)
    procedures = load_procedure_catalog(procedure_path, target_catalog=targets)
    if require_closure:
        issues = validate_catalog_closure(targets.targets, procedures.procedures)
        if issues:
            raise RecipeInvalidError("\n".join(issue.render() for issue in issues))
    return targets, procedures
