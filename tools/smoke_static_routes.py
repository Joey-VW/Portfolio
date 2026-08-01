#!/usr/bin/env python3
"""Smoke test tracked static routes and critical root deployment assets over HTTP."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import PurePosixPath
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CRITICAL_PATHS = (
    "/_headers",
    "/_redirects",
    "/styles.css",
    "/script.js",
    "/data/projects.json",
    "/data/showcase-config.json",
    "/data/ev-true-cost.json",
    "/data/gravity-fleet-sample-runs.json",
    "/data/shrinkflation-products.json",
    "/data/procurement-kpi-analysis.json",
    "/data/quote-to-cash-workflow-audit.json",
    "/data/phx-transit/synthetic/operations-replay.json",
    "/data/phx-transit/synthetic/state-scenarios.json",
    "/games/gravity-fleet/core.mjs",
    "/projects/phx-transit-pulse.js",
    "/projects/phx-transit-pulse-map.js",
    "/projects/multi-platform-publishing-system/demo/assets/background_image_clean.jpg",
    "/projects/multi-platform-publishing-system/demo/assets/video-bg/manifest.json",
    "/projects/multi-platform-publishing-system/demo/data/blog-posts.csv",
    "/projects/multi-platform-publishing-system/demo/data/map-photos.csv",
)

POSTCARD_DEMO_PREFIX = PurePosixPath("/projects/multi-platform-publishing-system/demo")
POSTCARD_MANIFEST = ROOT / "projects/multi-platform-publishing-system/demo/assets/video-bg/manifest.json"


def tracked_html_routes() -> list[str]:
    result = subprocess.run(
        ("git", "ls-files", "--", "*.html"),
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    routes: list[str] = []
    for line in result.stdout.splitlines():
        path = line.strip().replace("\\", "/")
        if not path:
            continue
        if path == "index.html":
            routes.append("/")
        elif path.endswith("/index.html"):
            routes.append(f"/{path.removesuffix('index.html')}")
        else:
            routes.append(f"/{path}")
    return sorted(routes)


def postcard_media_paths() -> list[str]:
    manifest = json.loads(POSTCARD_MANIFEST.read_text(encoding="utf-8"))
    paths: set[str] = set()
    for item in manifest.get("items", []):
        for key in ("src", "poster"):
            value = item.get(key)
            if isinstance(value, str) and value.startswith("./"):
                paths.add(str(POSTCARD_DEMO_PREFIX / value.removeprefix("./")))
    return sorted(paths)


def fetch_status(url: str, timeout: float) -> int:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return int(response.status)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--timeout", type=float, default=5)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    html_routes = tracked_html_routes()
    postcard_media = postcard_media_paths()
    paths = html_routes + list(CRITICAL_PATHS) + postcard_media
    failures: list[str] = []

    for route in paths:
        url = f"{base_url}{route}"
        try:
            status = fetch_status(url, args.timeout)
        except (urllib.error.URLError, TimeoutError) as error:
            failures.append(f"{route}: {error}")
            continue
        if status != 200:
            failures.append(f"{route}: HTTP {status}")

    if failures:
        print("Static route smoke failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        "Static route smoke passed: "
        f"{len(html_routes)} HTML routes, "
        f"{len(CRITICAL_PATHS)} critical assets, "
        f"and {len(postcard_media)} Postcard media URLs."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
