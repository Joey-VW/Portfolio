from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import tools.visual_qa_capture as visual_qa


class VisualQACaptureTests(unittest.TestCase):
    def test_default_screenshot_timeout_allows_tall_render_heavy_pages(self) -> None:
        with mock.patch.object(sys, "argv", ["visual_qa_capture.py"]):
            args = visual_qa.parse_args()

        self.assertEqual(args.screenshot_timeout_ms, 90_000)

    def test_load_targets_uses_public_registry_and_demo_pages(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            projects_file = root / "projects.json"
            projects_file.write_text(
                json.dumps(
                    [
                        {
                            "slug": "public-project",
                            "title": "Public Project",
                            "href": "/projects/public.html",
                            "visibility": "public",
                        },
                        {
                            "slug": "hidden-project",
                            "title": "Hidden Project",
                            "href": "/projects/hidden.html",
                            "visibility": "hidden",
                        },
                    ]
                ),
                encoding="utf-8",
            )
            demo_dir = root / "demo"
            demo_dir.mkdir()
            for name in ("index.html", "about.html", "404.html"):
                (demo_dir / name).write_text("<!doctype html>", encoding="utf-8")

            with (
                mock.patch.object(visual_qa, "PROJECTS_FILE", projects_file),
                mock.patch.object(visual_qa, "DEMO_DIR", demo_dir),
                mock.patch.object(visual_qa, "REPO_ROOT", root),
            ):
                targets = visual_qa.load_targets(include_demo=True)

        paths = [target.path for target in targets]
        self.assertIn("/", paths)
        self.assertIn("/projects/", paths)
        self.assertIn("/projects/public.html", paths)
        self.assertNotIn("/projects/hidden.html", paths)
        self.assertIn("/demo/index.html", paths)
        self.assertIn("/demo/about.html", paths)
        self.assertNotIn("/demo/404.html", paths)

    def test_primary_and_secondary_viewport_counts_are_deliberate(self) -> None:
        primary = visual_qa.Target("primary", "Primary", "/primary")
        secondary = visual_qa.Target("secondary", "Secondary", "/secondary", "secondary")
        self.assertEqual(len(visual_qa.viewports_for(primary)), 6)
        self.assertEqual(len(visual_qa.viewports_for(secondary)), 3)

    def test_slice_offsets_include_bottom_aligned_capture(self) -> None:
        self.assertEqual(visual_qa.slice_offsets(2500, 1000, 30), [0, 1000, 1500])
        self.assertEqual(visual_qa.slice_offsets(700, 1000, 30), [0])

    def test_slice_offsets_reject_incomplete_coverage(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "requires 5 viewport slices"):
            visual_qa.slice_offsets(5000, 1000, 3)

    def test_stitch_full_page_uses_slice_scroll_offsets(self) -> None:
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow is available only with the capture extra")

        with tempfile.TemporaryDirectory() as temp_dir:
            folder = Path(temp_dir)
            slices_dir = folder / "slices"
            slices_dir.mkdir()
            records = []
            for index, (offset, color) in enumerate(
                ((0, "red"), (10, "green"), (15, "blue")), start=1
            ):
                name = f"slice-{index:03d}.png"
                Image.new("RGB", (10, 10), color).save(slices_dir / name)
                records.append({"path": name, "actualY": offset})

            destination = folder / "full.png"
            visual_qa.stitch_full_page_from_slices(
                folder, destination, page_height=25, viewport_width=10, slices=records
            )

            with Image.open(destination) as full_image:
                self.assertEqual(full_image.size, (10, 25))
                self.assertEqual(full_image.getpixel((0, 0)), (255, 0, 0))
                self.assertEqual(full_image.getpixel((0, 12)), (0, 128, 0))
                self.assertEqual(full_image.getpixel((0, 20)), (0, 0, 255))

    def test_summarize_distinguishes_capture_errors_from_red_flags(self) -> None:
        summary = visual_qa.summarize(
            [
                {"status": "ok", "horizontalPageOverflowPx": 0},
                {"status": "ok", "brokenImageCount": 1},
                {"status": "error", "error": "boom"},
            ]
        )
        self.assertEqual(summary["captureCount"], 3)
        self.assertEqual(summary["errorCount"], 1)
        self.assertEqual(summary["automaticRedFlagCount"], 2)

    def test_summarize_flags_internal_horizontal_clipping(self) -> None:
        summary = visual_qa.summarize(
            [{"status": "ok", "horizontalClippedOverflowCount": 1}]
        )
        self.assertEqual(summary["automaticRedFlagCount"], 1)


if __name__ == "__main__":
    unittest.main()
