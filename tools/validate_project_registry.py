#!/usr/bin/env python3
"""Validate project lifecycle metadata, routes, and crawler visibility."""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
ROOT_RESOLVED = ROOT.resolve()
REGISTRY_PATH = ROOT / "data" / "projects.json"
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ALLOWED_STATUSES = {"ready", "in-progress", "planned"}
ALLOWED_VISIBILITIES = {"public", "hidden"}
EXTRA_UNFINISHED_ROUTES = (ROOT / "3-looping-animations(1).html",)


class RobotsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.has_noindex = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return
        values = {key.lower(): (value or "").lower() for key, value in attrs}
        directives = {item.strip() for item in values.get("content", "").split(",")}
        if values.get("name") == "robots" and "noindex" in directives:
            self.has_noindex = True


def is_valid_iso_date(value: object) -> bool:
    if not isinstance(value, str) or not DATE_PATTERN.fullmatch(value):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def route_path(href: object) -> Path | None:
    if not isinstance(href, str) or not href.startswith("/"):
        return None
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc:
        return None
    route = parsed.path.lstrip("/")
    if not route:
        route = "index.html"
    elif route.endswith("/"):
        route += "index.html"
    candidate = (ROOT / route).resolve()
    try:
        candidate.relative_to(ROOT_RESOLVED)
    except ValueError:
        return None
    return candidate


def has_noindex(path: Path) -> bool:
    parser = RobotsParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.has_noindex


def main() -> int:
    errors: list[str] = []
    projects = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if not isinstance(projects, list):
        print("Project registry must contain a JSON array.", file=sys.stderr)
        return 1

    seen_slugs: set[str] = set()
    seen_hrefs: set[str] = set()
    publishable: list[dict[str, object]] = []
    unfinished: list[dict[str, object]] = []

    for index, project in enumerate(projects):
        label = f"entry {index + 1}"
        if not isinstance(project, dict):
            errors.append(f"{label}: expected an object")
            continue

        slug = project.get("slug")
        if not isinstance(slug, str) or not slug.strip():
            errors.append(f"{label}: missing valid slug")
            slug = label
        elif slug in seen_slugs:
            errors.append(f"{slug}: duplicate slug")
        else:
            seen_slugs.add(slug)

        href = project.get("href")
        if not isinstance(href, str) or not href.strip():
            errors.append(f"{slug}: missing valid href")
        elif href in seen_hrefs:
            errors.append(f"{slug}: duplicate href {href}")
        else:
            seen_hrefs.add(href)

        title = project.get("title")
        if not isinstance(title, str) or not title.strip():
            errors.append(f"{slug}: missing valid title")

        created_at = project.get("createdAt")
        status = project.get("status")
        visibility = project.get("visibility")
        lifecycle_valid = True

        if not is_valid_iso_date(created_at):
            errors.append(f"{slug}: createdAt must be a real YYYY-MM-DD date")
            lifecycle_valid = False
        if status not in ALLOWED_STATUSES:
            errors.append(f"{slug}: invalid status {status!r}")
            lifecycle_valid = False
        if visibility not in ALLOWED_VISIBILITIES:
            errors.append(f"{slug}: invalid visibility {visibility!r}")
            lifecycle_valid = False

        path = route_path(href)
        if path is None:
            errors.append(f"{slug}: href must be a root-relative route inside the repository")
        elif not path.is_file():
            errors.append(f"{slug}: route does not resolve to a file: {href}")

        if lifecycle_valid and status == "ready" and visibility == "public":
            publishable.append(project)
        else:
            unfinished.append(project)
            if path and path.is_file() and not has_noindex(path):
                errors.append(f"{slug}: unfinished route is missing robots noindex: {href}")

    for path in EXTRA_UNFINISHED_ROUTES:
        if path.is_file() and not has_noindex(path):
            errors.append(f"development route is missing robots noindex: {path.relative_to(ROOT)}")

    publishable.sort(
        key=lambda project: (
            -date.fromisoformat(str(project["createdAt"])).toordinal(),
            str(project.get("title", "")).casefold(),
            str(project.get("slug", "")).casefold(),
        )
    )

    if errors:
        print("Project registry validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Validated {len(projects)} project entries.")
    print(f"Publishable ({len(publishable)}):")
    for project in publishable:
        print(f"- {project['createdAt']} | {project['title']} | {project['href']}")
    print(f"Unfinished and unlisted ({len(unfinished)}):")
    for project in unfinished:
        print(f"- {project['status']} / {project['visibility']} | {project['title']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
