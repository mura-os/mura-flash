from __future__ import annotations

import copy
from pathlib import Path

import pytest

from mura_flash.catalog import load_catalog
from mura_flash.errors import RecipeInvalidError, SafetyRefusalError
from mura_flash.jsonio import (
    DuplicateKeyError,
    load_strict_json,
    loads_strict_json,
)
from mura_flash.runner import ensure_allowlisted
from mura_flash.validation import load_contract, validate_recipe


def test_live_catalog_exactly_matches_contract() -> None:
    catalog = load_catalog()
    assert sorted(catalog.recipes) == sorted(load_contract()["targetIds"])


def test_strict_json_rejects_duplicate_keys() -> None:
    with pytest.raises(DuplicateKeyError, match="duplicate object key"):
        loads_strict_json('{"id":"one","id":"two"}')


def test_semantic_validation_rejects_unknown_probe() -> None:
    recipe = copy.deepcopy(load_catalog().recipes["quest-3-eureka"])
    recipe["probes"].append("adb.not-allowlisted")
    issues = validate_recipe(recipe)
    assert any("probe is not in contract" in issue.message for issue in issues)


@pytest.mark.parametrize(
    "argv",
    [
        ("adb", "reboot"),
        ("adb", "-s", "device", "shell", "id"),
        ("fastboot", "-s", "device", "getvar", "all"),
        ("fastboot", "-s", "device", "flash", "boot", "boot.img"),
    ],
)
def test_command_boundary_refuses_non_allowlisted_argv(argv: tuple[str, ...]) -> None:
    with pytest.raises(SafetyRefusalError):
        ensure_allowlisted(argv)


def test_shared_recipe_fixtures_when_present() -> None:
    fixture_root = Path("tests/fixtures/recipes")
    manifest_path = fixture_root / "manifest.json"
    if not manifest_path.exists():
        pytest.skip("shared fixtures are created by another workstream")
    manifest = load_strict_json(manifest_path)
    for relative, expected_error in manifest["fixtures"].items():
        fixture = fixture_root / relative
        if expected_error is None:
            assert load_catalog(fixture, require_complete=False).recipes
        else:
            with pytest.raises(RecipeInvalidError):
                load_catalog(fixture, require_complete=False)
