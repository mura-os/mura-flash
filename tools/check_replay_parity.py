#!/usr/bin/env python3
"""Require byte-identical Python and JavaScript replay output."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str]) -> bytes:
    result = subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{' '.join(command)} failed ({result.returncode}):\n"
            f"{result.stderr.decode(errors='replace')}"
        )
    return result.stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="scenario files (defaults to replay/scenarios/**/*.json)",
    )
    arguments = parser.parse_args()
    paths = arguments.paths or sorted((ROOT / "replay" / "scenarios").glob("**/*.json"))
    if not paths:
        raise RuntimeError("no replay scenarios found")

    for path in paths:
        absolute = path if path.is_absolute() else ROOT / path
        scenario = json.loads(absolute.read_text(encoding="utf-8"))
        procedure_id = scenario["procedureId"]
        python_output = run(
            [
                sys.executable,
                "-m",
                "mura_flash",
                "replay",
                procedure_id,
                "--scenario",
                str(absolute),
                "--json",
            ]
        )
        javascript_output = run(["node", "tools/replay_scenario.mjs", str(absolute)])
        if python_output != javascript_output:
            raise RuntimeError(f"replay output differs for {absolute.relative_to(ROOT)}")
        print(f"parity: {absolute.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
