#!/usr/bin/env python3
"""Capture the public portfolio surface for repeatable visual QA.

The utility discovers public project routes from data/projects.json, captures a
small responsive viewport matrix with Playwright, records browser/DOM diagnostics,
builds a browsable HTML report, and packages the run as a ZIP suitable for
GitHub Actions artifact upload.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

REPO_ROOT = Path(__file__).resolve().parents[1]
PROJECTS_FILE = REPO_ROOT / "data" / "projects.json"
DEMO_DIR = REPO_ROOT / "projects" / "multi-platform-publishing-system" / "demo"

PRIMARY_VIEWPORTS = (
    (1440, 1000, "desktop-1440"),
    (1280, 900, "laptop-1280"),
    (1024, 768, "compact-1024"),
    (768, 1024, "tablet-768"),
    (430, 932, "phone-430"),
    (390, 844, "phone-390"),
)
SECONDARY_VIEWPORTS = (
    (1440, 1000, "desktop-1440"),
    (768, 1024, "tablet-768"),
    (390, 844, "phone-390"),
)


@dataclass(frozen=True)
class Target:
    slug: str
    title: str
    path: str
    tier: str = "primary"


@dataclass(frozen=True)
class Viewport:
    width: int
    height: int
    label: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture all public portfolio pages for visual QA and package the run as a ZIP."
    )
    parser.add_argument(
        "--base-url",
        default="https://wistoworks.com",
        help="Site origin to capture. Default: https://wistoworks.com",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO_ROOT / "visual-qa-output",
        help="Run/archive output directory. Default: ./visual-qa-output",
    )
    parser.add_argument(
        "--device-scale-factor",
        type=float,
        default=1.0,
        help="Browser device scale factor. Native CSS-pixel captures default to 1.0.",
    )
    parser.add_argument(
        "--wait-ms",
        type=int,
        default=700,
        help="Final settle wait after fonts/images/warmup. Default: 700",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=45_000,
        help="Navigation timeout per page. Default: 45000",
    )
    parser.add_argument(
        "--no-demo",
        action="store_true",
        help="Skip the public Multi-Platform Publishing System demo subpages.",
    )
    parser.add_argument(
        "--route",
        action="append",
        default=[],
        help="Extra route to capture. Repeatable, e.g. --route /some-page.html",
    )
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Capture only matching target slugs. Repeatable; useful for a fast focused run.",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show Chromium while capturing. Default is headless.",
    )
    parser.add_argument(
        "--keep-going",
        action="store_true",
        default=True,
        help="Continue after a failed page/viewport capture. Default: enabled.",
    )
    parser.add_argument(
        "--fail-fast",
        dest="keep_going",
        action="store_false",
        help="Stop on the first failed page/viewport capture.",
    )
    parser.add_argument(
        "--max-slices",
        type=int,
        default=30,
        help="Safety cap for viewport slices per page/viewport. Default: 30",
    )
    parser.add_argument(
        "--no-zip",
        action="store_true",
        help="Leave the run directory unpackaged. By default a ZIP is created.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._").lower()
    return value or "page"


def normalize_route(path: str) -> str:
    path = "/" + path.strip()
    path = re.sub(r"/{2,}", "/", path)
    return path


def load_targets(include_demo: bool = True, extra_routes: list[str] | None = None) -> list[Target]:
    targets = [
        Target("home", "Homepage", "/"),
        Target("projects-index", "Projects index", "/projects/"),
    ]

    projects = json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    for project in projects:
        if project.get("visibility") != "public":
            continue
        href = project.get("href")
        slug = project.get("slug")
        title = project.get("title")
        if not isinstance(href, str) or not isinstance(slug, str) or not isinstance(title, str):
            continue
        targets.append(Target(slugify(slug), title, normalize_route(href)))

    if include_demo and DEMO_DIR.is_dir():
        for page in sorted(DEMO_DIR.glob("*.html")):
            if page.name == "404.html":
                continue
            relative = page.relative_to(REPO_ROOT).as_posix()
            name = "demo-home" if page.name == "index.html" else f"demo-{page.stem}"
            title = (
                "Publishing demo"
                if page.name == "index.html"
                else f"Publishing demo — {page.stem.title()}"
            )
            targets.append(Target(slugify(name), title, normalize_route(relative), "secondary"))

    for route in extra_routes or []:
        normalized = normalize_route(route)
        targets.append(
            Target(f"extra-{slugify(normalized)}", f"Extra route: {normalized}", normalized)
        )

    seen: set[str] = set()
    deduped: list[Target] = []
    for target in targets:
        if target.path in seen:
            continue
        seen.add(target.path)
        deduped.append(target)
    return deduped


def filter_targets(targets: list[Target], only: list[str]) -> list[Target]:
    if not only:
        return targets
    wanted = {slugify(item) for item in only}
    return [target for target in targets if target.slug in wanted]


def viewports_for(target: Target) -> list[Viewport]:
    raw = SECONDARY_VIEWPORTS if target.tier == "secondary" else PRIMARY_VIEWPORTS
    return [Viewport(width, height, label) for width, height, label in raw]


def import_playwright():
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is required. Install the capture extra and Chromium:\n"
            "  uv sync --extra capture\n"
            "  uv run playwright install chromium"
        ) from exc
    return sync_playwright, PlaywrightError, PlaywrightTimeoutError


def install_capture_hooks(context) -> None:
    context.add_init_script(
        """
        window.__VISUAL_QA__ = true;
        try {
            localStorage.setItem('visualQaCapture', '1');
        } catch (_) {}
        """
    )


def settle_page(page, wait_ms: int) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=8_000)
    except Exception:
        pass
    try:
        page.evaluate("() => document.fonts?.ready")
    except Exception:
        pass
    try:
        page.evaluate(
            """async () => {
                const images = [...document.images];
                await Promise.all(images.map(async (img) => {
                    if (img.complete) return;
                    await new Promise((resolve) => {
                        const done = () => resolve();
                        img.addEventListener('load', done, { once: true });
                        img.addEventListener('error', done, { once: true });
                        setTimeout(done, 2500);
                    });
                }));
            }"""
        )
    except Exception:
        pass

    try:
        dims = page.evaluate(
            """() => ({
                height: Math.max(
                    document.documentElement.scrollHeight,
                    document.body?.scrollHeight || 0
                ),
                viewport: window.innerHeight
            })"""
        )
        step = max(1, int(dims.get("viewport") or 800))
        height = max(step, int(dims.get("height") or step))
        for y in range(0, min(height, step * 30), step):
            page.evaluate("y => window.scrollTo(0, y)", y)
            page.wait_for_timeout(60)
        page.evaluate("() => window.scrollTo(0, 0)")
    except Exception:
        pass

    try:
        page.evaluate(
            """() => {
                document.documentElement.style.scrollBehavior = 'auto';
                if (document.body) document.body.style.scrollBehavior = 'auto';
            }"""
        )
    except Exception:
        pass
    page.wait_for_timeout(max(0, wait_ms))


def collect_dom_diagnostics(page) -> dict[str, Any]:
    return page.evaluate(
        """() => {
            const root = document.documentElement;
            const body = document.body;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const docWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
            const docHeight = Math.max(root.scrollHeight, body?.scrollHeight || 0);
            const brokenImages = [...document.images]
                .filter(img => !img.complete || img.naturalWidth === 0)
                .slice(0, 50)
                .map(img => ({ src: img.currentSrc || img.src || null, alt: img.alt || null }));
            const suspicious = [];
            const overflowing = [];
            for (const el of document.querySelectorAll('body *')) {
                const style = getComputedStyle(el);
                if (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    Number(style.opacity) === 0
                ) continue;
                const rect = el.getBoundingClientRect();
                if (rect.width < 8 || rect.height < 8) continue;
                if ((rect.right > viewportWidth + 4 || rect.left < -4) && suspicious.length < 50) {
                    suspicious.push({
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        className: typeof el.className === 'string'
                            ? el.className.slice(0, 180)
                            : null,
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        width: Math.round(rect.width)
                    });
                }
                const xOverflow = el.scrollWidth > el.clientWidth + 2;
                const yOverflow = el.scrollHeight > el.clientHeight + 2;
                const clips =
                    ['hidden', 'clip'].includes(style.overflowX) ||
                    ['hidden', 'clip'].includes(style.overflowY);
                if ((xOverflow || yOverflow) && clips && overflowing.length < 50) {
                    overflowing.push({
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        className: typeof el.className === 'string'
                            ? el.className.slice(0, 180)
                            : null,
                        xOverflow,
                        yOverflow,
                        clientWidth: el.clientWidth,
                        scrollWidth: el.scrollWidth,
                        clientHeight: el.clientHeight,
                        scrollHeight: el.scrollHeight
                    });
                }
            }
            return {
                title: document.title,
                url: location.href,
                viewport: { width: viewportWidth, height: viewportHeight },
                document: { width: docWidth, height: docHeight },
                horizontalPageOverflowPx: Math.max(0, docWidth - viewportWidth),
                brokenImages,
                suspiciousViewportEscapes: suspicious,
                clippedOverflowCandidates: overflowing,
            };
        }"""
    )


def set_fixed_elements_hidden(page, hidden: bool) -> int:
    return int(
        page.evaluate(
            """hidden => {
                const marker = 'data-visual-qa-fixed-hidden';
                const previous = 'data-visual-qa-fixed-visibility';
                const marked = [...document.querySelectorAll(`[${marker}]`)];
                for (const el of marked) {
                    el.style.visibility = el.getAttribute(previous) || '';
                    el.removeAttribute(marker);
                    el.removeAttribute(previous);
                }
                if (!hidden) return marked.length;

                let count = 0;
                for (const el of document.querySelectorAll('body *')) {
                    const style = getComputedStyle(el);
                    if (!['fixed', 'sticky'].includes(style.position)) continue;
                    if (style.display === 'none' || style.visibility === 'hidden') continue;
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 24 || rect.height < 12) continue;
                    if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
                    el.setAttribute(previous, el.style.visibility || '');
                    el.setAttribute(marker, '1');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    count += 1;
                }
                return count;
            }""",
            hidden,
        )
    )


def slice_offsets(page_height: int, viewport_height: int, max_slices: int) -> list[int]:
    page_height = max(viewport_height, page_height)
    max_scroll = max(0, page_height - viewport_height)
    offsets = list(range(0, max_scroll + 1, viewport_height))
    if not offsets or offsets[-1] != max_scroll:
        offsets.append(max_scroll)
    return offsets[: max(1, max_slices)]


def capture_slices(
    page, folder: Path, viewport: Viewport, max_slices: int
) -> list[dict[str, Any]]:
    slices_dir = folder / "slices"
    slices_dir.mkdir(parents=True, exist_ok=True)
    dims = page.evaluate(
        """() => ({
            height: Math.max(
                document.documentElement.scrollHeight,
                document.body?.scrollHeight || 0
            ),
            viewportHeight: window.innerHeight
        })"""
    )
    page_height = max(viewport.height, int(dims.get("height") or viewport.height))
    viewport_height = max(1, int(dims.get("viewportHeight") or viewport.height))
    records = []
    for index, y in enumerate(slice_offsets(page_height, viewport_height, max_slices), start=1):
        page.evaluate("y => window.scrollTo(0, y)", y)
        page.wait_for_timeout(80)
        actual_y = int(round(page.evaluate("() => window.scrollY")))
        path = slices_dir / f"slice-{index:03d}.png"
        hide_fixed = index > 1
        hidden_count = 0
        try:
            if hide_fixed:
                hidden_count = set_fixed_elements_hidden(page, True)
            page.screenshot(path=str(path), full_page=False, animations="disabled")
        finally:
            if hide_fixed:
                set_fixed_elements_hidden(page, False)
        records.append(
            {
                "index": index,
                "requestedY": y,
                "actualY": actual_y,
                "path": path.name,
                "fixedElementsHidden": hidden_count,
            }
        )
    page.evaluate("() => window.scrollTo(0, 0)")
    return records


def capture_one(
    browser,
    target: Target,
    viewport: Viewport,
    base_url: str,
    run_dir: Path,
    dpr: float,
    wait_ms: int,
    timeout_ms: int,
    max_slices: int,
) -> dict[str, Any]:
    page_dir = run_dir / "pages" / target.slug / viewport.label
    page_dir.mkdir(parents=True, exist_ok=True)
    console_messages: list[dict[str, str]] = []
    page_errors: list[str] = []
    failed_requests: list[dict[str, Any]] = []
    response_errors: list[dict[str, Any]] = []

    context = browser.new_context(
        viewport={"width": viewport.width, "height": viewport.height},
        device_scale_factor=dpr,
        reduced_motion="reduce",
    )
    install_capture_hooks(context)
    page = context.new_page()
    page.on(
        "console",
        lambda msg: console_messages.append({"type": msg.type, "text": msg.text})
        if msg.type in {"error", "warning"}
        else None,
    )
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on(
        "requestfailed",
        lambda request: failed_requests.append(
            {"url": request.url, "method": request.method, "failure": request.failure}
        ),
    )
    page.on(
        "response",
        lambda response: response_errors.append({"url": response.url, "status": response.status})
        if response.status >= 400
        else None,
    )

    url = urljoin(base_url.rstrip("/") + "/", target.path.lstrip("/"))
    record: dict[str, Any] = {
        "target": asdict(target),
        "viewport": asdict(viewport),
        "url": url,
        "status": "ok",
    }
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        record["httpStatus"] = response.status if response else None
        settle_page(page, wait_ms)
        diagnostics = collect_dom_diagnostics(page)
        full_path = page_dir / "full.png"
        page.screenshot(path=str(full_path), full_page=True, animations="disabled")
        slices = capture_slices(page, page_dir, viewport, max_slices)
        diagnostics.update(
            {
                "consoleMessages": console_messages[:100],
                "pageErrors": page_errors[:100],
                "failedRequests": failed_requests[:100],
                "httpErrorResponses": response_errors[:100],
            }
        )
        diagnostics_path = page_dir / "diagnostics.json"
        diagnostics_path.write_text(
            json.dumps(diagnostics, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        record.update(
            {
                "title": diagnostics.get("title"),
                "document": diagnostics.get("document"),
                "horizontalPageOverflowPx": diagnostics.get("horizontalPageOverflowPx", 0),
                "brokenImageCount": len(diagnostics.get("brokenImages", [])),
                "consoleIssueCount": len(console_messages),
                "pageErrorCount": len(page_errors),
                "failedRequestCount": len(failed_requests),
                "httpErrorResponseCount": len(response_errors),
                "sliceCount": len(slices),
                "fullImage": str(full_path.relative_to(run_dir).as_posix()),
                "slices": [
                    {
                        **item,
                        "path": str(
                            (page_dir / "slices" / item["path"])
                            .relative_to(run_dir)
                            .as_posix()
                        ),
                    }
                    for item in slices
                ],
                "diagnostics": str(diagnostics_path.relative_to(run_dir).as_posix()),
            }
        )
    except Exception as exc:
        record["status"] = "error"
        record["error"] = str(exc)
        (page_dir / "capture-error.txt").write_text(str(exc) + "\n", encoding="utf-8")
    finally:
        context.close()
    return record


def build_report(run_dir: Path, manifest: dict[str, Any]) -> None:
    captures = manifest["captures"]
    nav = []
    sections = []
    for capture in captures:
        target = capture["target"]
        viewport = capture["viewport"]
        anchor = slugify(f"{target['slug']}-{viewport['label']}")
        status = capture.get("status", "error")
        label = f"{target['title']} — {viewport['width']}×{viewport['height']}"
        nav.append(
            f'<li><a href="#{anchor}">{html.escape(label)}</a> — {html.escape(status)}</li>'
        )
        if status != "ok":
            body = f"<pre>{html.escape(capture.get('error', 'Unknown capture error'))}</pre>"
        else:
            warnings = []
            if capture.get("horizontalPageOverflowPx", 0):
                warnings.append(f"horizontal overflow: {capture['horizontalPageOverflowPx']}px")
            if capture.get("brokenImageCount", 0):
                warnings.append(f"broken images: {capture['brokenImageCount']}")
            if capture.get("pageErrorCount", 0):
                warnings.append(f"page errors: {capture['pageErrorCount']}")
            if capture.get("httpErrorResponseCount", 0):
                warnings.append(f"HTTP errors: {capture['httpErrorResponseCount']}")
            warning_text = ", ".join(warnings) if warnings else "no automatic red flags"
            slice_links = " ".join(
                f'<a href="{html.escape(item["path"])}">slice {item["index"]:03d}</a>'
                for item in capture.get("slices", [])
            )
            body = (
                f'<p><strong>Diagnostics:</strong> {html.escape(warning_text)} · '
                f'<a href="{html.escape(capture["diagnostics"])}">JSON</a></p>'
                f'<p><a href="{html.escape(capture["fullImage"])}">'
                "Open full-resolution full page</a></p>"
                f'<a href="{html.escape(capture["fullImage"])}">'
                f'<img loading="lazy" src="{html.escape(capture["fullImage"])}" '
                f'alt="{html.escape(label)}"></a>'
                f'<p class="slices">{slice_links}</p>'
            )
        sections.append(f'<section id="{anchor}"><h2>{html.escape(label)}</h2>{body}</section>')

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio Visual QA — {html.escape(manifest['runId'])}</title>
<style>
body {{
  font-family: system-ui, sans-serif;
  margin: 0 auto;
  max-width: 1200px;
  padding: 24px;
  background: #f5f5f5;
  color: #171717;
}}
h1, h2 {{ line-height: 1.1; }}
section {{
  background: white;
  margin: 24px 0;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.12);
}}
img {{ display: block; max-width: 100%; height: auto; border: 1px solid #ddd; }}
pre {{ white-space: pre-wrap; overflow-wrap: anywhere; }}
.slices a {{ display: inline-block; margin: 0 8px 8px 0; }}
</style>
</head>
<body>
<h1>Portfolio Visual QA</h1>
<p>
  Run <code>{html.escape(manifest['runId'])}</code> ·
  base URL <code>{html.escape(manifest['baseUrl'])}</code>
</p>
<p>
  {manifest['summary']['captureCount']} captures ·
  {manifest['summary']['errorCount']} errors ·
  {manifest['summary']['automaticRedFlagCount']} automatic red-flag captures.
</p>
<h2>Index</h2>
<ul>{''.join(nav)}</ul>
{''.join(sections)}
</body>
</html>
"""
    (run_dir / "report.html").write_text(page, encoding="utf-8")


def summarize(captures: list[dict[str, Any]]) -> dict[str, int]:
    error_count = sum(item.get("status") != "ok" for item in captures)
    red_flags = 0
    for item in captures:
        if item.get("status") != "ok":
            red_flags += 1
            continue
        if any(
            item.get(key, 0)
            for key in (
                "horizontalPageOverflowPx",
                "brokenImageCount",
                "pageErrorCount",
                "failedRequestCount",
                "httpErrorResponseCount",
            )
        ):
            red_flags += 1
    return {
        "captureCount": len(captures),
        "errorCount": error_count,
        "automaticRedFlagCount": red_flags,
    }


def archive_run(run_dir: Path) -> Path:
    archive_base = run_dir.parent / run_dir.name
    archive_path = Path(
        shutil.make_archive(
            str(archive_base), "zip", root_dir=run_dir.parent, base_dir=run_dir.name
        )
    )
    return archive_path


def main() -> int:
    args = parse_args()
    if args.device_scale_factor <= 0:
        print("Error: --device-scale-factor must be greater than zero.", file=sys.stderr)
        return 2
    if args.max_slices <= 0:
        print("Error: --max-slices must be greater than zero.", file=sys.stderr)
        return 2

    targets = load_targets(include_demo=not args.no_demo, extra_routes=args.route)
    targets = filter_targets(targets, args.only)
    if not targets:
        print("Error: no capture targets matched.", file=sys.stderr)
        return 2

    sync_playwright, PlaywrightError, _ = import_playwright()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    run_id = f"visual-qa-{stamp}"
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    run_dir = output_dir / run_id
    run_dir.mkdir(parents=False, exist_ok=False)

    captures: list[dict[str, Any]] = []
    started_at = datetime.now(timezone.utc).isoformat()
    print(f"Visual QA run: {run_id}")
    print(f"Base URL: {args.base_url}")
    print(f"Targets: {len(targets)}")

    try:
        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch(headless=not args.headed)
            except PlaywrightError as exc:
                raise RuntimeError(
                    "Chromium could not be launched. Run: uv run playwright install chromium"
                ) from exc

            for target in targets:
                for viewport in viewports_for(target):
                    print(f"  {target.slug:<32} {viewport.width:>4}x{viewport.height:<4}")
                    record = capture_one(
                        browser,
                        target,
                        viewport,
                        args.base_url,
                        run_dir,
                        args.device_scale_factor,
                        args.wait_ms,
                        args.timeout_ms,
                        args.max_slices,
                    )
                    captures.append(record)
                    if record.get("status") != "ok":
                        print(f"    ERROR: {record.get('error')}", file=sys.stderr)
                        if not args.keep_going:
                            browser.close()
                            raise RuntimeError(record.get("error", "capture failed"))
            browser.close()
    except Exception as exc:
        if not captures:
            shutil.rmtree(run_dir, ignore_errors=True)
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    manifest = {
        "schemaVersion": 1,
        "runId": run_id,
        "startedAt": started_at,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": args.base_url,
        "deviceScaleFactor": args.device_scale_factor,
        "targets": [asdict(target) for target in targets],
        "summary": summarize(captures),
        "captures": captures,
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    build_report(run_dir, manifest)

    archive_path = None if args.no_zip else archive_run(run_dir)
    print("\nCapture complete")
    print(f"  Run directory: {run_dir}")
    print(f"  Captures: {manifest['summary']['captureCount']}")
    print(f"  Capture errors: {manifest['summary']['errorCount']}")
    print(f"  Automatic red-flag captures: {manifest['summary']['automaticRedFlagCount']}")
    if archive_path:
        print(f"  Archive: {archive_path}")
    return 1 if manifest["summary"]["errorCount"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
