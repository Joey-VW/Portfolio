#!/usr/bin/env python3
"""Cross-platform command runner for the repository's deterministic checks."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

VALIDATION_COMMANDS = (
    ("Project registry", (sys.executable, "tools/validate_project_registry.py")),
    ("Project registry runtime", ("node", "tools/validate_project_registry_runtime.js")),
    ("JSON contracts", (sys.executable, "tools/validate_json_contracts.py")),
    ("EV True Cost", (sys.executable, "tools/validate_ev_true_cost.py")),
    ("PHX Transit map", (sys.executable, "tools/validate_phx_transit_map.py")),
    ("Gravity Fleet", ("node", "tools/validate_gravity_fleet.js")),
    ("Procurement case data", (sys.executable, "tools/procurement/validate_case_data.py")),
    ("Quote-to-Cash case data", (sys.executable, "tools/qtc/validate_case_data.py")),
)

TEST_COMMANDS = (
    (
        "Analytics modernization unit tests",
        (sys.executable, "-m", "unittest", "tests/test_analytics_modernization.py"),
    ),
    (
        "JSON contract negative fixture",
        (sys.executable, "tools/validate_json_contracts.py", "--self-test-invalid-fixture"),
    ),
    (
        "Kroger merge fixture",
        (sys.executable, "tools/fetch_kroger_products.py", "--test-merge-fixture"),
    ),
)


def run_commands(commands: tuple[tuple[str, tuple[str, ...]], ...]) -> int:
    """Run every command and return a failure after reporting the complete baseline."""
    failures: list[str] = []
    for label, command in commands:
        print(f"\n[{label}] {' '.join(command)}", flush=True)
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode:
            failures.append(f"{label} (exit {result.returncode})")

    if failures:
        print("\nFailed checks:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("\nAll checks passed.")
    return 0


def javascript_syntax_commands() -> tuple[tuple[str, tuple[str, ...]], ...]:
    result = subprocess.run(
        ("git", "ls-files", "--", "*.js", "*.mjs", "*.cjs"),
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    paths = sorted(
        path.strip().replace("\\", "/")
        for path in result.stdout.splitlines()
        if path.strip()
    )
    return tuple(
        (
            f"JavaScript syntax: {path}",
            ("node", "--check", path),
        )
        for path in paths
    )


def lint() -> int:
    commands = (
        (
            "Python byte compilation",
            (sys.executable, "-m", "compileall", "-q", "tools", "tests"),
        ),
        ("Ruff foundation scope", (sys.executable, "-m", "ruff", "check", "tools/check_all.py")),
        *javascript_syntax_commands(),
    )
    return run_commands(commands)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("group", choices=("lint", "validate", "test"))
    return parser.parse_args()


def main() -> int:
    group = parse_args().group
    if group == "lint":
        return lint()
    if group == "validate":
        return run_commands(VALIDATION_COMMANDS)
    return run_commands(TEST_COMMANDS)


if __name__ == "__main__":
    raise SystemExit(main())
