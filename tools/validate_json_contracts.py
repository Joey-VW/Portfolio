#!/usr/bin/env python3
"""Validate initial JSON schemas and repository contract checks."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

SCHEMA_TARGETS = (
    ("schemas/projects.schema.json", "data/projects.json"),
    ("schemas/showcase-config.schema.json", "data/showcase-config.json"),
    ("schemas/phx-transit-operations-replay.schema.json", "data/phx-transit/synthetic/operations-replay.json"),
    ("schemas/phx-transit-state-scenarios.schema.json", "data/phx-transit/synthetic/state-scenarios.json"),
    ("schemas/ev-true-cost.schema.json", "data/ev-true-cost.json"),
    ("schemas/shrinkflation-products.schema.json", "data/shrinkflation-products.json"),
    ("schemas/procurement-kpi-analysis.schema.json", "data/procurement-kpi-analysis.json"),
    ("schemas/quote-to-cash-workflow-audit.schema.json", "data/quote-to-cash-workflow-audit.json"),
)

APPROVED_NOINDEX_EXCEPTIONS = {
    "/projects/multi-platform-publishing-system.html",
}

DEPLOYABLE_PATHS = (
    "*.html",
    "*.css",
    "*.js",
    "*.mjs",
    "*.cjs",
    "data/projects.json",
    "data/showcase-config.json",
    "data/ev-true-cost.json",
    "data/gravity-fleet-sample-runs.json",
    "data/colony-sample-runs.json",
    "data/procurement-kpi-analysis.json",
    "data/quote-to-cash-workflow-audit.json",
    "data/shrinkflation-products.json",
    "data/phx-transit/synthetic/*.json",
)

SECRET_PATTERNS = (
    re.compile(r"BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY"),
    re.compile(r"\bKROGER_CLIENT_(?:ID|SECRET)\b"),
    re.compile(r"\b[A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)[A-Za-z0-9_]*\s*[:=]\s*['\"][^'\"]{8,}['\"]", re.IGNORECASE),
    re.compile(r"\bC:\\Users\\[^\\\s]+", re.IGNORECASE),
    re.compile(r"\b/Users/[^/\s]+"),
    re.compile(r"\b/home/[^/\s]+"),
)


class ContractError(Exception):
    """Raised when a schema or cross-file contract fails."""


def load_json(relative_path: str) -> object:
    with (ROOT / relative_path).open(encoding="utf-8") as handle:
        return json.load(handle)


def type_matches(value: object, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return (isinstance(value, int | float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return True


def resolve_ref(schema: dict[str, object], ref: str) -> dict[str, object]:
    if not ref.startswith("#/$defs/"):
        raise ContractError(f"unsupported schema ref {ref}")
    current: object = schema
    for part in ref.removeprefix("#/").split("/"):
        if not isinstance(current, dict) or part not in current:
            raise ContractError(f"unresolvable schema ref {ref}")
        current = current[part]
    if not isinstance(current, dict):
        raise ContractError(f"schema ref {ref} does not resolve to an object")
    return current


def validate_format(value: object, fmt: str, path: str) -> list[str]:
    if not isinstance(value, str):
        return []
    try:
        if fmt == "date":
            dt.date.fromisoformat(value)
        elif fmt == "date-time":
            dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        elif fmt == "uri":
            parsed = urlparse(value)
            if not parsed.scheme or not parsed.netloc:
                return [f"{path}: expected uri format"]
    except ValueError:
        return [f"{path}: expected {fmt} format"]
    return []


def validate_instance(value: object, schema: dict[str, object], root_schema: dict[str, object], path: str = "$") -> list[str]:
    if "$ref" in schema:
        return validate_instance(value, resolve_ref(root_schema, str(schema["$ref"])), root_schema, path)

    errors: list[str] = []
    expected_type = schema.get("type")
    if isinstance(expected_type, str) and not type_matches(value, expected_type):
        return [f"{path}: expected {expected_type}, got {type(value).__name__}"]

    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: expected one of {schema['enum']!r}")

    if isinstance(value, str):
        min_length = schema.get("minLength")
        if isinstance(min_length, int) and len(value) < min_length:
            errors.append(f"{path}: expected at least {min_length} characters")
        pattern = schema.get("pattern")
        if isinstance(pattern, str) and not re.search(pattern, value):
            errors.append(f"{path}: did not match pattern {pattern!r}")
        fmt = schema.get("format")
        if isinstance(fmt, str):
            errors.extend(validate_format(value, fmt, path))

    if isinstance(value, int | float) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        if isinstance(minimum, int | float) and value < minimum:
            errors.append(f"{path}: expected value >= {minimum}")

    if isinstance(value, list):
        min_items = schema.get("minItems")
        max_items = schema.get("maxItems")
        if isinstance(min_items, int) and len(value) < min_items:
            errors.append(f"{path}: expected at least {min_items} items")
        if isinstance(max_items, int) and len(value) > max_items:
            errors.append(f"{path}: expected at most {max_items} items")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                errors.extend(validate_instance(item, item_schema, root_schema, f"{path}[{index}]"))

    if isinstance(value, dict):
        required = schema.get("required")
        if isinstance(required, list):
            for key in required:
                if isinstance(key, str) and key not in value:
                    errors.append(f"{path}: missing required property {key!r}")
        properties = schema.get("properties")
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    errors.extend(validate_instance(value[key], child_schema, root_schema, f"{path}.{key}"))
        if schema.get("additionalProperties") is False and isinstance(properties, dict):
            extra_keys = sorted(set(value) - set(properties))
            for key in extra_keys:
                errors.append(f"{path}: unexpected property {key!r}")

    return errors


def validate_schemas() -> list[str]:
    errors: list[str] = []
    for schema_path, data_path in SCHEMA_TARGETS:
        schema = load_json(schema_path)
        data = load_json(data_path)
        if not isinstance(schema, dict):
            errors.append(f"{schema_path}: schema root must be an object")
            continue
        for error in validate_instance(data, schema, schema):
            errors.append(f"{data_path}: {error}")
    return errors


def has_noindex(relative_path: str) -> bool:
    text = (ROOT / relative_path).read_text(encoding="utf-8")
    return bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', text, re.IGNORECASE))


def validate_registry_contracts() -> list[str]:
    errors: list[str] = []
    projects = load_json("data/projects.json")
    if not isinstance(projects, list):
        return ["data/projects.json: expected registry array for contract checks"]

    seen_slugs: set[str] = set()
    showcase_visuals: set[str] = set()
    for project in projects:
        if not isinstance(project, dict):
            continue
        slug = str(project.get("slug", ""))
        href = str(project.get("href", ""))
        route_path = href.removeprefix("/")
        publishable = project.get("status") == "ready" and project.get("visibility") == "public"
        featured = project.get("featured") is True
        showcase = project.get("showcase")

        if slug in seen_slugs:
            errors.append(f"data/projects.json: duplicate slug {slug!r}")
        seen_slugs.add(slug)

        if href and not (ROOT / route_path).is_file():
            errors.append(f"data/projects.json: route does not exist for {slug}: {href}")
            continue

        if href and (ROOT / route_path).is_file():
            route_noindex = has_noindex(route_path)
            if publishable and route_noindex and href not in APPROVED_NOINDEX_EXCEPTIONS:
                errors.append(f"{href}: publishable route must not be noindex")
            if not publishable and not route_noindex:
                errors.append(f"{href}: unpublishable route must be noindex")

        if publishable and featured and showcase is None:
            errors.append(f"data/projects.json: public featured project must include showcase metadata: {slug}")
        if isinstance(showcase, dict):
            visual_key = showcase.get("visualKey")
            if isinstance(visual_key, str):
                if visual_key in showcase_visuals:
                    errors.append(f"data/projects.json: duplicate showcase visualKey {visual_key!r}")
                showcase_visuals.add(visual_key)

    return errors


def git_ls_files(patterns: tuple[str, ...]) -> list[str]:
    result = subprocess.run(
        ("git", "ls-files", "--", *patterns),
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return sorted(line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip())


def validate_deployable_text() -> list[str]:
    errors: list[str] = []
    for relative_path in git_ls_files(DEPLOYABLE_PATHS):
        text = (ROOT / relative_path).read_text(encoding="utf-8")
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                errors.append(f"{relative_path}: deployable input matched forbidden pattern {pattern.pattern!r}")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schemas-only", action="store_true", help="Only validate JSON files against their schemas.")
    parser.add_argument(
        "--self-test-invalid-fixture",
        action="store_true",
        help="Assert that the deliberately invalid projects fixture fails schema validation.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test_invalid_fixture:
        schema = load_json("schemas/projects.schema.json")
        fixture = load_json("tests/fixtures/contracts/invalid-projects.json")
        if not isinstance(schema, dict):
            print("projects schema root must be an object", file=sys.stderr)
            return 1
        errors = validate_instance(fixture, schema, schema)
        if not errors:
            print("Invalid projects fixture unexpectedly passed schema validation.", file=sys.stderr)
            return 1
        print(f"Invalid projects fixture failed as expected: {len(errors)} schema errors.")
        return 0

    errors = validate_schemas()
    if not args.schemas_only:
        errors.extend(validate_registry_contracts())
        errors.extend(validate_deployable_text())

    if errors:
        print("JSON contract validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"JSON contract validation passed: {len(SCHEMA_TARGETS)} schema targets and repository contracts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
