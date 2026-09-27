from __future__ import annotations

import json
from pathlib import Path

from mura_flash.cli import main
from mura_flash.runner import CommandResult


class CliRunner:
    def __init__(self, devices: bytes) -> None:
        self.devices = devices

    def run(
        self,
        argv: tuple[str, ...],
        *,
        timeout: int,
        max_output: int,
    ) -> CommandResult:
        del timeout, max_output
        if argv == ("adb", "version"):
            return CommandResult(
                argv,
                0,
                b"Android Debug Bridge version 1.0.41\nVersion 35.0.2\n",
            )
        if argv == ("adb", "devices"):
            return CommandResult(argv, 0, self.devices)
        raise AssertionError(f"unexpected command shape: {argv[0]}")


def test_bare_invocation_prints_help(capsys) -> None:
    assert main([]) == 0
    captured = capsys.readouterr()
    assert "usage: mura-flash" in captured.out
    assert captured.err == ""


def test_targets_json_flag_is_common_before_or_after_command(capsys) -> None:
    assert main(["--json", "targets"]) == 0
    first = json.loads(capsys.readouterr().out)
    assert len(first["targets"]) == 15

    assert main(["targets", "--json"]) == 0
    second = json.loads(capsys.readouterr().out)
    assert second == first


def test_validate_default_catalog(capsys) -> None:
    assert main(["validate", "--json"]) == 0
    output = json.loads(capsys.readouterr().out)
    assert output["valid"] is True
    assert len(output["targets"]) == 15


def test_usage_error_uses_contract_exit_code(capsys) -> None:
    assert main(["show"]) == 2
    assert "required" in capsys.readouterr().err


def test_json_recipe_error_names_contract_class(capsys) -> None:
    fixture = Path("tests/fixtures/recipes/invalid/duplicate-key.json")
    if not fixture.exists():
        return
    assert main(["validate", str(fixture), "--json"]) == 2
    error = json.loads(capsys.readouterr().err)
    assert error["error"]["code"] == "recipe-invalid"


def test_plain_missing_device_error_does_not_disclose_requested_serial(
    capsys,
    monkeypatch,
) -> None:
    serial = "synthetic-private-serial"
    runner = CliRunner(b"List of devices attached\n\n")
    monkeypatch.setattr("mura_flash.cli.SubprocessRunner", lambda: runner)

    assert (
        main(
            [
                "inspect",
                "quest-3-eureka",
                "--transport",
                "adb",
                "--serial",
                serial,
            ]
        )
        == 3
    )
    captured = capsys.readouterr()
    assert serial not in captured.out
    assert serial not in captured.err


def test_json_duplicate_device_error_does_not_disclose_serial(
    capsys,
    monkeypatch,
) -> None:
    serial = "synthetic-private-serial"
    runner = CliRunner(f"List of devices attached\n{serial}\tdevice\n{serial}\tdevice\n".encode())
    monkeypatch.setattr("mura_flash.cli.SubprocessRunner", lambda: runner)

    assert (
        main(
            [
                "inspect",
                "quest-3-eureka",
                "--transport",
                "adb",
                "--serial",
                serial,
                "--json",
            ]
        )
        == 4
    )
    captured = capsys.readouterr()
    error = json.loads(captured.err)
    assert error["error"]["code"] == "probe-failed"
    assert serial not in captured.out
    assert serial not in captured.err
