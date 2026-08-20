from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import tools.visual_qa_capture as visual_qa


class VisualQACaptureTests(unittest.TestCase):
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
