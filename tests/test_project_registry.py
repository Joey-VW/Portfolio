from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

from tools import validate_project_registry as validator


class ProjectRegistryCrawlerStateTests(unittest.TestCase):
    def run_fixture(
        self,
        *,
        status: str,
        visibility: str,
        route_html: str,
        slug: str,
    ) -> tuple[int, str, str]:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            data_dir.mkdir()
            href = "/fixture.html"
            registry_path = data_dir / "projects.json"
            registry_path.write_text(
                json.dumps(
                    [
                        {
                            "slug": slug,
                            "createdAt": "2026-08-07",
                            "status": status,
                            "visibility": visibility,
                            "title": "Fixture Project",
                            "href": href,
                        }
                    ]
                ),
                encoding="utf-8",
            )
            (root / "fixture.html").write_text(route_html, encoding="utf-8")

            stdout = io.StringIO()
            stderr = io.StringIO()
            with (
                patch.object(validator, "ROOT", root),
                patch.object(validator, "ROOT_RESOLVED", root.resolve()),
                patch.object(validator, "REGISTRY_PATH", registry_path),
                patch.object(validator, "EXTRA_UNFINISHED_ROUTES", ()),
                redirect_stdout(stdout),
                redirect_stderr(stderr),
            ):
                result = validator.main()

        return result, stdout.getvalue(), stderr.getvalue()

    def test_public_ready_route_with_noindex_fails(self) -> None:
        result, _, stderr = self.run_fixture(
            status="ready",
            visibility="public",
            route_html='<meta name="robots" content="noindex, nofollow" />',
            slug="public-noindex",
        )
        self.assertEqual(result, 1)
        self.assertIn(
            "public-noindex: public route must not contain robots noindex: /fixture.html",
            stderr,
        )

    def test_unfinished_hidden_route_without_noindex_fails(self) -> None:
        result, _, stderr = self.run_fixture(
            status="in-progress",
            visibility="hidden",
            route_html="<title>Indexable fixture</title>",
            slug="hidden-indexable",
        )
        self.assertEqual(result, 1)
        self.assertIn(
            "hidden-indexable: unfinished route is missing robots noindex: /fixture.html",
            stderr,
        )

    def test_public_ready_route_without_noindex_passes(self) -> None:
        result, stdout, stderr = self.run_fixture(
            status="ready",
            visibility="public",
            route_html="<title>Public fixture</title>",
            slug="public-indexable",
        )
        self.assertEqual(result, 0)
        self.assertEqual(stderr, "")
        self.assertIn("Publishable (1):", stdout)


if __name__ == "__main__":
    unittest.main()
