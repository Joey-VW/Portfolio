#!/usr/bin/env python3
"""Capture full-page and tiled screenshots of a rendered webpage.

This is a local developer utility intended for sharing what a page looks like
while working on static portfolio pages, including pages served by VS Code Live
Server. It uses Playwright so screenshots reflect a real browser render.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

SETUP_HELP = """\nSetup commands:\n  pip install playwright pillow\n  python -m playwright install chromium\n"""

DEFAULT_URL = "http://127.0.0.1:5500/"

def default_output_dir() -> Path:
    repo_name = Path.cwd().resolve().name
    return Path("..") / f"{repo_name}-captures"

LIVE_SERVER_OUTPUT_WARNING = (
    "Warning: output directory is inside the repo. Live Server may refresh the page while capture files "
    "are written. Prefer --output-dir ../portfolio-captures."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Capture a rendered webpage. Full mode creates one tall stitched "
            "screenshot from reliable scrolled viewport captures."
        )
    )
    parser.add_argument(
        "url",
        nargs="?",
        default=DEFAULT_URL,
        help=f"URL to capture. Default: {DEFAULT_URL}",
    )
    parser.add_argument(
        "--mode",
        choices=("full", "grid", "both"),
        default="both",
        help=(
            "Capture mode. full stitches scrolled viewport captures into one tall image; "
            "grid creates a contact sheet; both captures tiles once and creates both. Default: both"
        ),
    )
    interactive_group = parser.add_mutually_exclusive_group()
    interactive_group.add_argument(
        "--interactive",
        dest="interactive",
        action="store_true",
        default=True,
        help="Open a headed browser and wait for Enter before capturing. Default.",
    )
    interactive_group.add_argument(
        "--no-interactive",
        dest="interactive",
        action="store_false",
        help="Run headless without waiting for Enter.",
    )    
    parser.add_argument("--width", type=int, default=1440, help="Viewport width. Default: 1440")
    parser.add_argument("--height", type=int, default=1000, help="Viewport height. Default: 1000")
    parser.add_argument(
        "--device-scale-factor",
        type=float,
        default=2,
        help="Device scale factor for crisp captures. Default: 2",
    )
    parser.add_argument("--wait-ms", type=int, default=1500, help="Wait after load. Default: 1500")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory where timestamped capture folders are created. Default: ../[repo name]-captures",
    )    
    parser.add_argument("--slug", help="Optional friendly output folder name prefix.")
    parser.add_argument(
        "--scroll-warmup",
        action="store_true",
        help="Scroll through the page before capture to trigger lazy-loaded content.",
    )
    parser.add_argument(
        "--keep-tiles",
        action="store_true",
        help="Keep intermediate tile-001.png files for debugging. Default: delete after outputs are created.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print and store detailed scroll/capture diagnostics in meta.json.",
    )
    parser.add_argument(
        "--grid-columns",
        type=int,
        choices=(1, 2, 3),
        default=2,
        help="Number of columns for grid/contact-sheet output. Default: 2",
    )
    parser.add_argument(
        "--fixed-elements",
        choices=("keep", "hide-after-first", "hide-all"),
        default="hide-after-first",
        help=(
            "How to handle visible position: fixed/sticky elements while capturing viewport tiles. "
            "Default: hide-after-first"
        ),
    )
    parser.add_argument(
        "--post-enter-wait-ms",
        type=int,
        default=1500,
        help="Interactive-only wait after pressing Enter before capture starts. Default: 1500",
    )
    parser.add_argument(
        "--wait-for-selector",
        help="Optional selector to wait for after Enter in interactive mode and before capture.",
    )
    parser.add_argument(
        "--wait-for-text-gone",
        help="Optional text to wait until absent after Enter in interactive mode and before capture.",
    )
    parser.add_argument(
        "--privacy-reminder",
        action="store_true",
        help="Print a reminder that screenshots may include visible personal/account data.",
    )
    return parser.parse_args()


def friendly_slug(url: str, provided: str | None) -> str:
    raw = provided or urlparse(url).path.strip("/").split("/")[-1] or urlparse(url).netloc or "capture"
    raw = raw.removesuffix(".html")
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw).strip("-._").lower()
    return slug or "capture"


def output_folder(output_dir: Path, url: str, slug: str | None) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    folder = output_dir / f"{friendly_slug(url, slug)}-{stamp}"
    folder.mkdir(parents=True, exist_ok=False)
    return folder


def path_is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def import_playwright():
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is not installed. Install the local capture dependencies." + SETUP_HELP
        ) from exc
    return sync_playwright, PlaywrightError, PlaywrightTimeoutError


def import_pillow():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as exc:
        raise RuntimeError("Pillow is required to build stitched and grid screenshots." + SETUP_HELP) from exc
    return Image, ImageDraw, ImageFont


def page_dimensions(page) -> dict[str, int]:
    return page.evaluate(
        """() => ({
            width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
            height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        })"""
    )


def scroll_diagnostics(page) -> dict[str, Any]:
    return page.evaluate(
        """() => {
            const el = document.scrollingElement || document.documentElement || document.body;
            const style = window.getComputedStyle(document.body || document.documentElement);
            return {
                scrollingElementTagName: el?.tagName || null,
                windowScrollY: window.scrollY,
                documentElementScrollTop: document.documentElement?.scrollTop ?? null,
                bodyScrollTop: document.body?.scrollTop ?? null,
                scrollingElementScrollTop: el?.scrollTop ?? null,
                scrollingElementScrollHeight: el?.scrollHeight ?? null,
                scrollingElementClientHeight: el?.clientHeight ?? null,
                backgroundColor: style?.backgroundColor || "#ffffff"
            };
        }"""
    )


def safe_scroll_diagnostics(page) -> dict[str, Any]:
    try:
        return scroll_diagnostics(page)
    except Exception as exc:
        message = str(exc)
        lowered = message.lower()
        navigation_or_context_destroyed = any(
            phrase in lowered
            for phrase in (
                "execution context was destroyed",
                "most likely because of a navigation",
                "target page, context or browser has been closed",
                "navigation",
            )
        )
        return {"error": message, "navigationOrContextDestroyed": navigation_or_context_destroyed}


def diagnostics_errors(*items: Any) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []

    def visit(item: Any, path: str) -> None:
        if isinstance(item, dict):
            if "error" in item:
                errors.append(
                    {
                        "path": path,
                        "error": item.get("error"),
                        "navigationOrContextDestroyed": item.get("navigationOrContextDestroyed", False),
                    }
                )
            for key, value in item.items():
                visit(value, f"{path}.{key}" if path else str(key))
        elif isinstance(item, list):
            for index, value in enumerate(item):
                visit(value, f"{path}[{index}]")

    for index, item in enumerate(items):
        visit(item, f"diagnostics[{index}]")
    return errors


def set_fixed_elements_hidden(page, hidden: bool) -> int:
    return int(
        page.evaluate(
            """hidden => {
                const marker = 'data-capture-page-fixed-hidden';
                const previousDisplay = 'data-capture-page-previous-display';
                const previousVisibility = 'data-capture-page-previous-visibility';
                const restore = () => {
                    let restored = 0;
                    document.querySelectorAll(`[${marker}]`).forEach((el) => {
                        el.style.display = el.getAttribute(previousDisplay) || '';
                        el.style.visibility = el.getAttribute(previousVisibility) || '';
                        el.removeAttribute(marker);
                        el.removeAttribute(previousDisplay);
                        el.removeAttribute(previousVisibility);
                        restored += 1;
                    });
                    return restored;
                };
                if (!hidden) return restore();

                restore();
                let hiddenCount = 0;
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
                document.querySelectorAll('body *').forEach((el) => {
                    const style = window.getComputedStyle(el);
                    if (!['fixed', 'sticky'].includes(style.position)) return;
                    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
                    const rect = el.getBoundingClientRect();
                    const width = Math.max(0, rect.width);
                    const height = Math.max(0, rect.height);
                    const area = width * height;
                    const intersectsViewport = rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
                    if (!intersectsViewport || width < 24 || height < 12 || area < 500) return;
                    const coversPage = width >= viewportWidth * 0.95 && height >= viewportHeight * 0.95;
                    if (coversPage) return;
                    el.setAttribute(previousDisplay, el.style.display || '');
                    el.setAttribute(previousVisibility, el.style.visibility || '');
                    el.setAttribute(marker, 'true');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    hiddenCount += 1;
                });
                return hiddenCount;
            }""",
            hidden,
        )
    )


def wait_for_async_content(page, args: argparse.Namespace, TimeoutError) -> dict[str, Any]:
    result: dict[str, Any] = {
        "postEnterWaitMsApplied": args.post_enter_wait_ms if args.interactive else 0,
        "selector": None,
        "textGone": None,
    }
    if args.interactive and args.post_enter_wait_ms > 0:
        page.wait_for_timeout(args.post_enter_wait_ms)
    if args.wait_for_selector:
        selector_result = {"value": args.wait_for_selector, "ok": False, "timedOut": False, "error": None}
        try:
            page.wait_for_selector(args.wait_for_selector, state="visible", timeout=10_000)
            selector_result["ok"] = True
        except TimeoutError:
            selector_result["timedOut"] = True
            print(f"Warning: timed out waiting for selector before capture: {args.wait_for_selector}")
        except Exception as exc:
            selector_result["error"] = str(exc)
            print(f"Warning: could not wait for selector before capture: {exc}")
        result["selector"] = selector_result
    if args.wait_for_text_gone:
        text_result = {"value": args.wait_for_text_gone, "ok": False, "timedOut": False, "error": None}
        try:
            page.wait_for_function(
                """text => !(document.body?.innerText || '').includes(text)""",
                arg=args.wait_for_text_gone,
                timeout=10_000,
            )
            text_result["ok"] = True
        except TimeoutError:
            text_result["timedOut"] = True
            print(f"Warning: timed out waiting for text to disappear before capture: {args.wait_for_text_gone}")
        except Exception as exc:
            text_result["error"] = str(exc)
            print(f"Warning: could not wait for text before capture: {exc}")
        result["textGone"] = text_result
    return result


def warmup_scroll(page, wait_ms: int) -> None:
    dims = page_dimensions(page)
    viewport_height = max(1, int(dims["viewportHeight"]))
    page_height = max(viewport_height, int(dims["height"]))
    for y in range(0, page_height + viewport_height, viewport_height):
        page.evaluate("y => window.scrollTo(0, y)", y)
        page.wait_for_timeout(min(350, max(50, wait_ms // 4)))
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(min(500, max(100, wait_ms // 3)))


def scroll_offsets(page_height: int, viewport_height: int) -> list[int]:
    """Return top-to-bottom scroll offsets with a final bottom-aligned tile."""
    viewport_height = max(1, viewport_height)
    page_height = max(viewport_height, page_height)
    max_scroll = max(0, page_height - viewport_height)
    offsets = list(range(0, max_scroll + 1, viewport_height))
    if not offsets or offsets[-1] != max_scroll:
        offsets.append(max_scroll)
    return offsets


def prepare_deterministic_scroll(page) -> None:
    page.evaluate(
        """() => {
            const id = 'capture-page-disable-smooth-scroll';
            document.getElementById(id)?.remove();
            const style = document.createElement('style');
            style.id = id;
            style.textContent = `
                html, body, * { scroll-behavior: auto !important; }
                * { animation-delay: 0s !important; }
            `;
            document.head.appendChild(style);
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
        }"""
    )


def scroll_to_offset(page, requested_y: int, viewport_height: int, TimeoutError) -> dict[str, Any]:
    max_scroll = page.evaluate(
        """() => {
            const el = document.scrollingElement || document.documentElement || document.body;
            return Math.max(0, (el?.scrollHeight || document.documentElement.scrollHeight) - window.innerHeight);
        }"""
    )
    target_y = int(max(0, min(requested_y, max_scroll)))
    page.evaluate(
        """y => {
            const el = document.scrollingElement || document.documentElement || document.body;
            if (el) el.scrollTop = y;
            window.scrollTo({ left: 0, top: y, behavior: 'instant' });
            if (document.documentElement) document.documentElement.scrollTop = y;
            if (document.body) document.body.scrollTop = y;
        }""",
        target_y,
    )
    tolerance = max(2, min(8, viewport_height * 0.01))
    verification_passed = True
    try:
        page.wait_for_function(
            """([y, tolerance]) => {
                const el = document.scrollingElement || document.documentElement || document.body;
                const values = [
                    el?.scrollTop,
                    window.scrollY,
                    document.documentElement?.scrollTop,
                    document.body?.scrollTop
                ].filter(value => Number.isFinite(value));
                return values.some(value => Math.abs(value - y) <= tolerance);
            }""",
            arg=[target_y, tolerance],
            timeout=2_000,
        )
    except TimeoutError:
        verification_passed = False
    page.wait_for_timeout(120)
    after = safe_scroll_diagnostics(page)
    values = [
        after.get("scrollingElementScrollTop"),
        after.get("windowScrollY"),
        after.get("documentElementScrollTop"),
        after.get("bodyScrollTop"),
    ]
    actual_y = int(round(next((float(value) for value in values if isinstance(value, (int, float))), 0)))
    return {
        "requestedY": requested_y,
        "targetY": target_y,
        "actualY": actual_y,
        "scrollVerificationPassed": verification_passed,
        "diagnosticsAfterScroll": after,
    }


def gather_tiles(
    page, folder: Path, viewport_height: int, TimeoutError, fixed_elements: str
) -> tuple[list[dict[str, Any]], dict[str, int], list[dict[str, Any]], int]:
    prepare_deterministic_scroll(page)
    dims = page_dimensions(page)
    page_height = max(viewport_height, int(dims["height"]))
    tiles: list[dict[str, Any]] = []
    fixed_elements_hidden_count = 0

    for index, requested_y in enumerate(scroll_offsets(page_height, viewport_height), start=1):
        scroll_result = scroll_to_offset(page, requested_y, viewport_height, TimeoutError)
        tile_path = folder / f"tile-{index:03d}.png"
        should_hide_fixed = fixed_elements == "hide-all" or (fixed_elements == "hide-after-first" and index > 1)
        try:
            fixed_elements_hidden_count = max(fixed_elements_hidden_count, set_fixed_elements_hidden(page, should_hide_fixed))
            before_shot = safe_scroll_diagnostics(page)
            page.screenshot(path=str(tile_path), full_page=False)
            after_shot = safe_scroll_diagnostics(page)
        finally:
            if should_hide_fixed:
                try:
                    set_fixed_elements_hidden(page, False)
                except Exception:
                    pass
        actual_y = int(scroll_result["actualY"])
        tiles.append(
            {
                "index": index,
                "path": tile_path,
                "requestedY": requested_y,
                "actualY": actual_y,
                "actualYBeforeScreenshot": before_shot.get("scrollingElementScrollTop"),
                "actualYAfterScreenshot": after_shot.get("scrollingElementScrollTop"),
                "scrollVerificationPassed": scroll_result["scrollVerificationPassed"],
                "diagnosticsBeforeScreenshot": before_shot,
                "diagnosticsAfterScreenshot": after_shot,
                "fixedElementsHidden": should_hide_fixed,
            }
        )

    try:
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(120)
        set_fixed_elements_hidden(page, False)
    except Exception:
        pass
    return tiles, dims, [dict(tile, path=str(tile["path"].name)) for tile in tiles], fixed_elements_hidden_count


def needs_clip_fallback(tiles: list[dict[str, Any]]) -> bool:
    if any(not tile.get("scrollVerificationPassed") for tile in tiles):
        return True
    expected_to_move = [tile for tile in tiles if int(tile["requestedY"]) > 0]
    if not expected_to_move:
        return False
    actuals = [int(round(float(tile.get("actualY") or 0))) for tile in tiles]
    return len(set(actuals)) <= 1


def gather_cdp_clip_tiles(page, context, folder: Path, viewport_height: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    prepare_deterministic_scroll(page)
    dims = page_dimensions(page)
    page_height = max(viewport_height, int(dims["height"]))
    viewport_width = int(dims["viewportWidth"])
    session = context.new_cdp_session(page)
    tiles: list[dict[str, Any]] = []
    for index, requested_y in enumerate(scroll_offsets(page_height, viewport_height), start=1):
        clip_height = min(viewport_height, page_height - requested_y)
        tile_path = folder / f"tile-{index:03d}.png"
        result = session.send(
            "Page.captureScreenshot",
            {
                "format": "png",
                "captureBeyondViewport": True,
                "clip": {
                    "x": 0,
                    "y": requested_y,
                    "width": viewport_width,
                    "height": max(1, clip_height),
                    "scale": 1,
                },
            },
        )
        tile_path.write_bytes(base64.b64decode(result["data"]))
        tiles.append(
            {
                "index": index,
                "path": tile_path,
                "requestedY": requested_y,
                "actualY": requested_y,
                "actualYBeforeScreenshot": requested_y,
                "actualYAfterScreenshot": requested_y,
                "scrollVerificationPassed": True,
                "captureMethod": "cdp-clip",
            }
        )
    return tiles, dims


def build_full_image(
    tiles: list[dict[str, Any]],
    full_path: Path,
    page_height: int,
    viewport_width: int,
    viewport_height: int,
    Image,
    background: str = "#ffffff",
) -> Path:
    opened = [Image.open(tile["path"]).convert("RGB") for tile in tiles]
    try:
        scale_x = opened[0].width / max(1, viewport_width)
        scale_y = opened[0].height / max(1, viewport_height)
        canvas_width = opened[0].width
        canvas_height = int(round(page_height * scale_y))
        stitched = Image.new("RGB", (canvas_width, canvas_height), background)
        for tile, image in zip(tiles, opened):
            y = int(tile["actualY"])
            paste_y = int(round(y * scale_y))
            crop_height = max(1, min(image.height, canvas_height - paste_y))
            cropped = image.crop((0, 0, min(image.width, int(round(viewport_width * scale_x))), crop_height))
            stitched.paste(cropped, (0, paste_y))
        stitched.save(full_path)
        stitched.close()
    finally:
        for image in opened:
            image.close()
    return full_path


def build_contact_sheet(
    tile_paths: list[Path], grid_path: Path, Image, ImageDraw, ImageFont, scale: float, columns: int
) -> Path:
    tiles = [Image.open(path).convert("RGB") for path in tile_paths]
    columns = max(1, min(columns, len(tiles)))
    label_height = max(28, int(22 * scale))
    gutter = max(8, int(6 * scale))
    tile_width = max(tile.width for tile in tiles)
    tile_height = max(tile.height for tile in tiles)
    rows = math.ceil(len(tiles) / columns)
    sheet_width = columns * tile_width + (columns + 1) * gutter
    sheet_height = rows * (tile_height + label_height) + (rows + 1) * gutter
    sheet = Image.new("RGB", (sheet_width, sheet_height), "#f5f5f5")
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("DejaVuSans.ttf", max(14, int(12 * scale)))
    except Exception:
        font = ImageFont.load_default()

    for i, tile in enumerate(tiles):
        row, col = divmod(i, columns)
        x = gutter + col * (tile_width + gutter)
        y = gutter + row * (tile_height + label_height + gutter)
        draw.rectangle((x, y, x + tile_width, y + label_height), fill="#222222")
        draw.text((x + gutter, y + max(4, gutter // 2)), f"Tile {i + 1:03d}", fill="#ffffff", font=font)
        sheet.paste(tile, (x, y + label_height))

    sheet.save(grid_path)
    sheet.close()
    for tile in tiles:
        tile.close()
    return grid_path


def cleanup_tiles(tiles: list[dict[str, Any]]) -> list[Path]:
    deleted: list[Path] = []
    for tile in tiles:
        path = tile["path"]
        try:
            path.unlink()
            deleted.append(path)
        except FileNotFoundError:
            pass
    return deleted


def write_meta(folder: Path, meta: dict[str, Any]) -> Path:
    meta_path = folder / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return meta_path


def navigate(page, url: str, wait_ms: int, TimeoutError) -> None:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        try:
            page.wait_for_load_state("networkidle", timeout=10_000)
        except TimeoutError:
            pass
        page.wait_for_timeout(wait_ms)
    except Exception as exc:
        raise RuntimeError(
            f"Could not reach or load URL: {url}\n"
            "Check that the local server is running and the URL is reachable."
        ) from exc


def main() -> int:
    args = parse_args()
    
    if args.output_dir is None:
        args.output_dir = default_output_dir()    
    
    if args.privacy_reminder:
        print("Privacy reminder: screenshots may include visible personal, account, or local development data.")
    output_inside_repo = path_is_inside(args.output_dir, Path.cwd())
    live_server_reload_risk = output_inside_repo
    if output_inside_repo:
        print(LIVE_SERVER_OUTPUT_WARNING)

    try:
        sync_playwright, PlaywrightError, PlaywrightTimeoutError = import_playwright()
        if args.mode in ("grid", "both"):
            import_pillow()

        saved_paths: list[Path] = []
        full_path: Path | None = None
        grid_path: Path | None = None
        tile_paths: list[Path] = []
        deleted_tile_paths: list[Path] = []

        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch(headless=not args.interactive)
            except PlaywrightError as exc:
                raise RuntimeError(
                    "Chromium browser binaries are missing or cannot be launched." + SETUP_HELP
                ) from exc

            context = browser.new_context(
                viewport={"width": args.width, "height": args.height},
                device_scale_factor=args.device_scale_factor,
            )
            page = context.new_page()
            navigate(page, args.url, args.wait_ms, PlaywrightTimeoutError)

            if args.scroll_warmup:
                warmup_scroll(page, args.wait_ms)

            if args.interactive:
                print("Adjust the page in the browser, then press Enter here to capture.")
                input()
            async_waits = wait_for_async_content(page, args, PlaywrightTimeoutError)

            browser_info = {"name": browser.browser_type.name, "version": browser.version}
            folder = output_folder(args.output_dir, args.url, args.slug)
            Image, ImageDraw, ImageFont = import_pillow()

            initial_scroll_diagnostics = safe_scroll_diagnostics(page)
            tiles, dims, scroll_tile_diagnostics, fixed_elements_hidden_count = gather_tiles(
                page, folder, args.height, PlaywrightTimeoutError, args.fixed_elements
            )
            capture_fallback_used = needs_clip_fallback(tiles)
            capture_method = "scroll-and-stitch"
            if capture_fallback_used:
                cleanup_tiles(tiles)
                tiles, dims = gather_cdp_clip_tiles(page, context, folder, args.height)
                capture_method = "cdp-clip"
            tile_paths = [tile["path"] for tile in tiles]
            final_scroll_diagnostics = safe_scroll_diagnostics(page)
            background = final_scroll_diagnostics.get("backgroundColor") or "#ffffff"

            if args.debug:
                print("Debug capture diagnostics:")
                print(f"  Page dimensions: {dims.get('width')}x{dims.get('height')}")
                print(f"  Viewport: {dims.get('viewportWidth')}x{dims.get('viewportHeight')}")
                print(f"  Scroll element: {final_scroll_diagnostics.get('scrollingElementTagName')}")
                print(f"  Capture method: {capture_method}")
                print(f"  Fallback used: {capture_fallback_used}")
                for tile in tiles:
                    print(
                        "  Tile {index:03d}: requested={requestedY} actualBefore={actualYBeforeScreenshot} "
                        "actualAfter={actualYAfterScreenshot} verified={scrollVerificationPassed}".format(**tile)
                    )

            if args.mode in ("full", "both"):
                full_path = build_full_image(
                    tiles,
                    folder / "full.png",
                    int(dims.get("height") or args.height),
                    int(dims.get("viewportWidth") or args.width),
                    int(dims.get("viewportHeight") or args.height),
                    Image,
                    background,
                )
                saved_paths.append(full_path)

            if args.mode in ("grid", "both"):
                grid_path = build_contact_sheet(
                    tile_paths,
                    folder / "grid.png",
                    Image,
                    ImageDraw,
                    ImageFont,
                    args.device_scale_factor,
                    args.grid_columns,
                )
                saved_paths.append(grid_path)

            if not args.keep_tiles:
                deleted_tile_paths = cleanup_tiles(tiles)
            else:
                saved_paths.extend(tile_paths)

            meta = {
                "url": args.url,
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "mode": args.mode,
                "captureStrategy": capture_method,
                "captureMethod": capture_method,
                "captureFallbackUsed": capture_fallback_used,
                "debug": args.debug,
                "gridColumns": args.grid_columns,
                "outputDirectory": str(args.output_dir),
                "outputDirectoryInsideRepo": output_inside_repo,
                "liveServerReloadRisk": live_server_reload_risk,
                "fixedElements": args.fixed_elements,
                "fixedElementsHiddenCount": fixed_elements_hidden_count,
                "postEnterWaitMs": args.post_enter_wait_ms,
                "waitForSelector": args.wait_for_selector,
                "waitForTextGone": args.wait_for_text_gone,
                "asyncWaits": async_waits,
                "viewport": {"width": args.width, "height": args.height},
                "deviceScaleFactor": args.device_scale_factor,
                "fullPageDimensions": {"width": dims.get("width"), "height": dims.get("height")},
                "detectedPageDimensions": dims,
                "scrollElement": final_scroll_diagnostics.get("scrollingElementTagName"),
                "scrollDiagnostics": {
                    "initial": initial_scroll_diagnostics,
                    "afterCapture": final_scroll_diagnostics,
                },
                "tileCount": len(tiles),
                "tileOffsets": [
                    {
                        "index": tile["index"],
                        "requestedY": tile["requestedY"],
                        "actualY": tile["actualY"],
                        "actualYBeforeScreenshot": tile.get("actualYBeforeScreenshot"),
                        "actualYAfterScreenshot": tile.get("actualYAfterScreenshot"),
                        "scrollVerificationPassed": tile.get("scrollVerificationPassed"),
                        "screenshotPath": tile["path"].name if args.keep_tiles else None,
                    }
                    for tile in tiles
                ],
                "tileDiagnostics": [
                    {
                        "index": tile["index"],
                        "requestedY": tile["requestedY"],
                        "actualYBeforeScreenshot": tile.get("actualYBeforeScreenshot"),
                        "actualYAfterScreenshot": tile.get("actualYAfterScreenshot"),
                        "scrollVerificationPassed": tile.get("scrollVerificationPassed"),
                        "screenshotPath": tile["path"].name if args.keep_tiles else None,
                        "captureMethod": tile.get("captureMethod", capture_method),
                        "fixedElementsHidden": tile.get("fixedElementsHidden", False),
                    }
                    for tile in tiles
                ],
                "scrollTileDiagnostics": scroll_tile_diagnostics,
                "diagnosticsErrors": diagnostics_errors(
                    initial_scroll_diagnostics, final_scroll_diagnostics, scroll_tile_diagnostics, tiles
                ),
                "tilesKept": args.keep_tiles,
                "tilesDeleted": [str(path.name) for path in deleted_tile_paths],
                "fullImagePath": str(full_path.name) if full_path else None,
                "gridImagePath": str(grid_path.name) if grid_path else None,
                "browser": browser_info,
                "interactive": args.interactive,
                "scrollWarmup": args.scroll_warmup,
            }
            saved_paths.append(write_meta(folder, meta))
            context.close()
            browser.close()

        print(f"Capture folder: {folder}")
        for path in saved_paths:
            print(f"Saved: {path}")
        return 0
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
