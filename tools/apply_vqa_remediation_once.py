#!/usr/bin/env python3
"""One-shot patcher for the first visual-QA remediation pass.

This file is intentionally deleted by its own successful run before the branch
is committed. Every replacement is assertion-checked so upstream drift fails
rather than silently producing a partial patch.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "apply-vqa-remediation.yml"


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {relative}; found {count}: {old[:90]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def append_once(relative: str, marker: str, block: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if marker in text:
        raise RuntimeError(f"Remediation marker already exists in {relative}: {marker}")
    path.write_text(text.rstrip() + "\n\n" + block.strip() + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Capture utility correctness
# ---------------------------------------------------------------------------
replace_once(
    "tools/visual_qa_capture.py",
    '''    parser.add_argument(\n        "--max-slices",\n        type=int,\n        default=30,\n        help="Safety cap for viewport slices per page/viewport. Default: 30",\n    )''',
    '''    parser.add_argument(\n        "--max-slices",\n        type=int,\n        default=60,\n        help="Safety cap for viewport slices per page/viewport. Default: 60",\n    )''',
)
replace_once(
    "tools/visual_qa_capture.py",
    "def settle_page(page, wait_ms: int) -> None:",
    "def settle_page(page, wait_ms: int, max_slices: int) -> None:",
)
replace_once(
    "tools/visual_qa_capture.py",
    '        for y in range(0, min(height, step * 30), step):',
    '        for y in range(0, min(height, step * max_slices), step):',
)
replace_once(
    "tools/visual_qa_capture.py",
    '''            const brokenImages = [...document.images]\n                .filter(img => !img.complete || img.naturalWidth === 0)\n                .slice(0, 50)\n                .map(img => ({ src: img.currentSrc || img.src || null, alt: img.alt || null }));''',
    '''            const brokenImages = [...document.images]\n                .filter(img => {\n                    const source = img.currentSrc || img.getAttribute('src') || img.getAttribute('srcset');\n                    return Boolean(source) && (!img.complete || img.naturalWidth === 0);\n                })\n                .slice(0, 50)\n                .map(img => ({ src: img.currentSrc || img.src || null, alt: img.alt || null }));''',
)
replace_once(
    "tools/visual_qa_capture.py",
    '''                clippedOverflowCandidates: overflowing,\n            };''',
    '''                clippedOverflowCandidates: overflowing,\n                horizontalClippedOverflowCount: overflowing.filter(item => item.xOverflow).length,\n            };''',
)
replace_once(
    "tools/visual_qa_capture.py",
    '''def slice_offsets(page_height: int, viewport_height: int, max_slices: int) -> list[int]:\n    page_height = max(viewport_height, page_height)\n    max_scroll = max(0, page_height - viewport_height)\n    offsets = list(range(0, max_scroll + 1, viewport_height))\n    if not offsets or offsets[-1] != max_scroll:\n        offsets.append(max_scroll)\n    return offsets[: max(1, max_slices)]''',
    '''def slice_offsets(page_height: int, viewport_height: int, max_slices: int) -> list[int]:\n    page_height = max(viewport_height, page_height)\n    max_scroll = max(0, page_height - viewport_height)\n    offsets = list(range(0, max_scroll + 1, viewport_height))\n    if not offsets or offsets[-1] != max_scroll:\n        offsets.append(max_scroll)\n    limit = max(1, max_slices)\n    if len(offsets) > limit:\n        raise RuntimeError(\n            f"Page requires {len(offsets)} viewport slices for complete coverage, "\n            f"but --max-slices is {limit}. Increase --max-slices; coverage will not be truncated silently."\n        )\n    return offsets''',
)
replace_once(
    "tools/visual_qa_capture.py",
    "        settle_page(page, wait_ms)",
    "        settle_page(page, wait_ms, max_slices)",
)
replace_once(
    "tools/visual_qa_capture.py",
    '''                "horizontalPageOverflowPx": diagnostics.get("horizontalPageOverflowPx", 0),\n                "brokenImageCount": len(diagnostics.get("brokenImages", [])),''',
    '''                "horizontalPageOverflowPx": diagnostics.get("horizontalPageOverflowPx", 0),\n                "horizontalClippedOverflowCount": diagnostics.get(\n                    "horizontalClippedOverflowCount", 0\n                ),\n                "brokenImageCount": len(diagnostics.get("brokenImages", [])),''',
)
replace_once(
    "tools/visual_qa_capture.py",
    '''            if capture.get("horizontalPageOverflowPx", 0):\n                warnings.append(f"horizontal overflow: {capture['horizontalPageOverflowPx']}px")\n            if capture.get("brokenImageCount", 0):''',
    '''            if capture.get("horizontalPageOverflowPx", 0):\n                warnings.append(f"horizontal overflow: {capture['horizontalPageOverflowPx']}px")\n            if capture.get("horizontalClippedOverflowCount", 0):\n                warnings.append(\n                    f"horizontal clipped-overflow candidates: {capture['horizontalClippedOverflowCount']}"\n                )\n            if capture.get("brokenImageCount", 0):''',
)
replace_once(
    "tools/visual_qa_capture.py",
    '''                "horizontalPageOverflowPx",\n                "brokenImageCount",''',
    '''                "horizontalPageOverflowPx",\n                "horizontalClippedOverflowCount",\n                "brokenImageCount",''',
)

# Focused regression coverage for the two capture-contract changes.
replace_once(
    "tests/test_visual_qa_capture.py",
    '''    def test_slice_offsets_include_bottom_aligned_capture(self) -> None:\n        self.assertEqual(visual_qa.slice_offsets(2500, 1000, 30), [0, 1000, 1500])\n        self.assertEqual(visual_qa.slice_offsets(700, 1000, 30), [0])\n\n    def test_summarize_distinguishes_capture_errors_from_red_flags(self) -> None:''',
    '''    def test_slice_offsets_include_bottom_aligned_capture(self) -> None:\n        self.assertEqual(visual_qa.slice_offsets(2500, 1000, 30), [0, 1000, 1500])\n        self.assertEqual(visual_qa.slice_offsets(700, 1000, 30), [0])\n\n    def test_slice_offsets_reject_incomplete_coverage(self) -> None:\n        with self.assertRaisesRegex(RuntimeError, "requires 5 viewport slices"):\n            visual_qa.slice_offsets(5000, 1000, 3)\n\n    def test_summarize_distinguishes_capture_errors_from_red_flags(self) -> None:''',
)
replace_once(
    "tests/test_visual_qa_capture.py",
    '''        self.assertEqual(summary["captureCount"], 3)\n        self.assertEqual(summary["errorCount"], 1)\n        self.assertEqual(summary["automaticRedFlagCount"], 2)\n\n\nif __name__ == "__main__":''',
    '''        self.assertEqual(summary["captureCount"], 3)\n        self.assertEqual(summary["errorCount"], 1)\n        self.assertEqual(summary["automaticRedFlagCount"], 2)\n\n    def test_summarize_flags_internal_horizontal_clipping(self) -> None:\n        summary = visual_qa.summarize(\n            [{"status": "ok", "horizontalClippedOverflowCount": 1}]\n        )\n        self.assertEqual(summary["automaticRedFlagCount"], 1)\n\n\nif __name__ == "__main__":''',
)

# Keep the operator docs aligned with the new completeness contract.
replace_once(
    "docs/visual-qa-capture.md",
    "The full-page PNGs provide page context; the slices are the preferred source for pixel-level inspection because they retain native viewport resolution instead of compressing a very tall page into one preview.",
    "The full-page PNGs provide page context; the slices are the preferred source for pixel-level inspection because they retain native viewport resolution instead of compressing a very tall page into one preview. The default slice safety cap is 60. If a page would require more slices, the capture fails explicitly instead of silently omitting the bottom of the page; raise `--max-slices` and rerun that target.",
)

# ---------------------------------------------------------------------------
# Confirmed responsive defects from visual-qa-20260820-015712Z
# ---------------------------------------------------------------------------
append_once(
    "styles.css",
    "Visual QA remediation — compact desktop homepage header",
    '''/* Visual QA remediation — compact desktop homepage header (1024px QA finding). */\n@media (min-width: 981px) and (max-width: 1080px) {\n  .homepage-topbar { gap: 0.55rem; }\n\n  .homepage-topbar .topnav a {\n    padding-inline: 0.72rem;\n  }\n\n  .homepage-topbar .print-button {\n    display: inline-grid;\n    place-items: center;\n    width: 44px;\n    min-width: 44px;\n    height: 44px;\n    min-height: 44px;\n    padding: 0;\n  }\n\n  .homepage-topbar .print-button .print-icon {\n    width: 1.15rem;\n    height: 1.15rem;\n    margin: 0;\n  }\n\n  .homepage-topbar .print-button-label { display: none; }\n}''',
)

append_once(
    "projects/ev-true-cost.css",
    "Visual QA remediation — make every EV section link visible",
    '''/* Visual QA remediation — make every EV section link visible on phones. */\n@media (max-width: 760px) {\n  .ev-subnav {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    overflow: visible;\n  }\n\n  .ev-subnav a {\n    justify-content: center;\n    min-width: 0;\n    padding-inline: 0.55rem;\n    text-align: center;\n  }\n\n  .ev-subnav a:last-child {\n    grid-column: 1 / -1;\n  }\n}''',
)

append_once(
    "projects/quote-to-cash-workflow-audit.css",
    "Visual QA remediation — make the mobile lifecycle table intentionally scrollable",
    '''/* Visual QA remediation — make the mobile lifecycle table intentionally scrollable. */\n@media (max-width: 680px) {\n  .segment-table-wrap {\n    position: relative;\n    overscroll-behavior-x: contain;\n    scrollbar-color: rgba(167, 139, 250, 0.62) rgba(148, 163, 184, 0.12);\n    scrollbar-width: thin;\n  }\n\n  .segment-table-wrap::before {\n    content: "Swipe to see all lifecycle columns →";\n    position: sticky;\n    left: 0;\n    z-index: 3;\n    display: block;\n    width: max-content;\n    max-width: 100%;\n    padding: 0.55rem 0.75rem 0.35rem;\n    color: #c4b5fd;\n    font-size: 0.72rem;\n    font-weight: 850;\n    letter-spacing: 0.01em;\n  }\n\n  .segment-table :is(th, td):first-child {\n    position: sticky;\n    left: 0;\n    z-index: 2;\n    background: #0b1120;\n    box-shadow: 1px 0 0 rgba(148, 163, 184, 0.18);\n  }\n\n  .segment-table thead th:first-child {\n    z-index: 3;\n  }\n}''',
)

append_once(
    "projects/multi-platform-publishing-system/demo/assets/css/styles.css",
    "Visual QA remediation — contain ambient overflow and expose mobile navigation",
    '''/* Visual QA remediation — contain ambient overflow and expose mobile navigation. */\n.ambient-video-bg {\n  contain: paint;\n  overflow: clip;\n}\n\n@media (max-width: 520px) {\n  .nav-primary-links {\n    flex-wrap: wrap;\n    overflow-x: visible;\n    padding-bottom: 0;\n    scrollbar-width: auto;\n  }\n\n  .nav-primary-links a {\n    flex: 1 1 auto;\n    justify-content: center;\n    white-space: nowrap;\n  }\n}''',
)

# Remove the one-shot machinery so only durable product/tooling changes are committed.
WORKFLOW.unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
