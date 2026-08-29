from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://wistoworks.com"


class PublicReleaseMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))

    def public_pages(self) -> dict[str, str]:
        pages = {
            "index.html": f"{ORIGIN}/",
            "projects/index.html": f"{ORIGIN}/projects/",
        }
        for project in self.registry:
            if project.get("status") == "ready" and project.get("visibility") == "public":
                href = project["href"]
                # Cloudflare Pages redirects tracked *.html source files to clean public URLs.
                canonical_path = href.removesuffix(".html")
                pages[href.lstrip("/")] = f"{ORIGIN}{canonical_path}"
        return pages

    def test_public_pages_have_one_canonical_and_matching_og_url(self) -> None:
        for relative_path, canonical in self.public_pages().items():
            with self.subTest(path=relative_path):
                text = (ROOT / relative_path).read_text(encoding="utf-8")
                canonical_tag = f'<link rel="canonical" href="{canonical}" />'
                og_url = f'<meta property="og:url" content="{canonical}" />'
                self.assertTrue(canonical.startswith("https://wistoworks.com/"))
                self.assertEqual(text.count(canonical_tag), 1)
                self.assertEqual(text.count(og_url), 1)

    def test_public_pages_use_current_home_contact_and_repository_refs(self) -> None:
        forbidden = (
            "joewisto.com",
            "joey.wisto@gmail.com",
            'href="/index.html',
            'href="./index.html',
            "/tree/feat/procurement-sql-evidence/",
        )
        for relative_path in self.public_pages():
            with self.subTest(path=relative_path):
                text = (ROOT / relative_path).read_text(encoding="utf-8")
                for value in forbidden:
                    self.assertNotIn(value, text)

    def test_primary_repository_surfaces_use_current_domain(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("https://wistoworks.com/", readme)
        self.assertIn("connect@wistoworks.com", readme)
        self.assertNotIn("joewisto.com", readme)

    def test_duplicate_index_forms_redirect_to_canonical_routes(self) -> None:
        redirects = (ROOT / "_redirects").read_text(encoding="utf-8").splitlines()
        self.assertIn("/index.html / 301", redirects)
        self.assertIn("/projects/index.html /projects/ 301", redirects)

    def test_root_404_is_present_and_noindex(self) -> None:
        text = (ROOT / "404.html").read_text(encoding="utf-8")
        self.assertIn('<meta name="robots" content="noindex, nofollow" />', text)
        self.assertIn('href="/"', text)
        self.assertNotIn('rel="canonical"', text)
        self.assertNotIn("joey.wisto@gmail.com", text)
        self.assertNotIn("joewisto.com", text)


if __name__ == "__main__":
    unittest.main()
