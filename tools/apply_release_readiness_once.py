#!/usr/bin/env python3
"""One-shot patcher for final public release-readiness corrections."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://wistoworks.com"
PUBLIC_PAGES = {
    "index.html": f"{ORIGIN}/",
    "projects/index.html": f"{ORIGIN}/projects/",
    "projects/phx-transit-pulse.html": f"{ORIGIN}/projects/phx-transit-pulse.html",
    "projects/shrinkflation-tracker.html": f"{ORIGIN}/projects/shrinkflation-tracker.html",
    "games/gravity-fleet-lab.html": f"{ORIGIN}/games/gravity-fleet-lab.html",
    "projects/procurement-kpi-analysis.html": f"{ORIGIN}/projects/procurement-kpi-analysis.html",
    "projects/quote-to-cash-workflow-audit.html": f"{ORIGIN}/projects/quote-to-cash-workflow-audit.html",
    "projects/multi-platform-publishing-system.html": f"{ORIGIN}/projects/multi-platform-publishing-system.html",
    "projects/ev-true-cost.html": f"{ORIGIN}/projects/ev-true-cost.html",
}


def write_if_changed(path: Path, text: str) -> None:
    current = path.read_text(encoding="utf-8")
    if current != text:
        path.write_text(text, encoding="utf-8", newline="\n")


def patch_html(path: Path, canonical: str) -> None:
    text = path.read_text(encoding="utf-8")

    # Normalize the site's own home links so / is the single public home URL.
    text = text.replace('href="/index.html', 'href="/')
    text = text.replace('href="./index.html', 'href="/')

    # Public contact surfaces use the branded portfolio address.
    text = text.replace("mailto:joey.wisto@gmail.com", "mailto:connect@wistoworks.com")

    # Add or normalize the canonical URL.
    canonical_tag = f'  <link rel="canonical" href="{canonical}" />'
    if re.search(r'<link\s+rel=["\']canonical["\']', text, flags=re.I):
        text = re.sub(
            r'\s*<link\s+rel=["\']canonical["\'][^>]*>\s*',
            f"\n{canonical_tag}\n",
            text,
            count=1,
            flags=re.I,
        )
    else:
        icon_match = re.search(r'(?m)^\s*<link rel="icon"[^>]*>\s*$', text)
        if not icon_match:
            raise RuntimeError(f"Could not locate favicon insertion point in {path}")
        text = text[: icon_match.start()] + canonical_tag + "\n" + text[icon_match.start() :]

    # Open Graph URLs should agree with the canonical URL.
    og_url = f'  <meta property="og:url" content="{canonical}" />'
    if re.search(r'<meta\s+property=["\']og:url["\']', text, flags=re.I):
        text = re.sub(
            r'(?m)^\s*<meta\s+property=["\']og:url["\'][^>]*>\s*$',
            og_url,
            text,
            count=1,
            flags=re.I,
        )
    else:
        type_match = re.search(r'(?m)^\s*<meta\s+property=["\']og:type["\'][^>]*>\s*$', text)
        if not type_match:
            raise RuntimeError(f"Could not locate og:type insertion point in {path}")
        insert_at = type_match.end()
        text = text[:insert_at] + "\n" + og_url + text[insert_at:]

    write_if_changed(path, text)


for relative_path, canonical_url in PUBLIC_PAGES.items():
    patch_html(ROOT / relative_path, canonical_url)

# The Procurement feature branch was merged and retired; public evidence links must be durable.
procurement = ROOT / "projects/procurement-kpi-analysis.html"
text = procurement.read_text(encoding="utf-8")
text = text.replace(
    "https://github.com/Joey-VW/Portfolio/tree/feat/procurement-sql-evidence/",
    "https://github.com/Joey-VW/Portfolio/tree/main/",
)
write_if_changed(procurement, text)

# Normalize duplicate index-file URL forms at the edge.
redirects = ROOT / "_redirects"
redirect_text = redirects.read_text(encoding="utf-8")
required_redirects = [
    "/index.html / 301",
    "/projects/index.html /projects/ 301",
]
lines = [line.rstrip() for line in redirect_text.splitlines() if line.strip()]
for rule in reversed(required_redirects):
    if rule not in lines:
        lines.insert(0, rule)
write_if_changed(redirects, "\n".join(lines) + "\n")

# Cloudflare Pages otherwise treats this multi-page site like an SPA for unknown routes.
# A real root 404 document restores the expected HTTP 404 behavior.
not_found = ROOT / "404.html"
not_found.write_text(
    '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#080b1a" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="The requested portfolio page could not be found." />
  <title>Page not found | Joe Wisto Portfolio</title>
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="ambient" aria-hidden="true"><span class="orb orb-one"></span><span class="orb orb-two"></span><span class="orb orb-three"></span><span class="grid-glow"></span></div>
  <header class="topbar" aria-label="Portfolio navigation">
    <a class="brand-mark" href="/"><span class="brand-glyph">JW</span><span class="brand-copy"><strong>Joe Wisto</strong><small>Systems • Automation • Analytics • BI</small></span></a>
    <nav class="topnav" aria-label="404 navigation"><a href="/">Home</a><a href="/projects/">Projects</a></nav>
  </header>
  <main id="main" class="resume-shell portfolio-shell">
    <section class="hero panel project-hero">
      <div class="hero-copy">
        <p class="eyebrow">404 · Page not found</p>
        <h1>This route doesn't exist.</h1>
        <p class="hero-title">The portfolio is still here.</p>
        <p class="hero-summary">The link may be outdated or the address may have been typed incorrectly.</p>
        <div class="hero-actions"><a class="button primary" href="/">Go home</a><a class="button" href="/projects/">Browse projects</a></div>
      </div>
    </section>
  </main>
  <footer class="site-footer"><p>Joe Wisto’s portfolio of practical systems, analytics, automation, and technical projects.</p><p class="footer-links"><a href="mailto:connect@wistoworks.com">Email</a><a href="https://github.com/Joey-VW/Portfolio" target="_blank" rel="noopener noreferrer">GitHub</a></p></footer>
</body>
</html>
''',
    encoding="utf-8",
    newline="\n",
)

# Add a deterministic regression test for the public canonical/contact surface.
test_path = ROOT / "tests/test_public_release_metadata.py"
test_path.write_text(
    '''from __future__ import annotations

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
                pages[href.lstrip("/")] = f"{ORIGIN}{href}"
        return pages

    def test_public_pages_have_one_canonical_and_matching_og_url(self) -> None:
        for relative_path, canonical in self.public_pages().items():
            with self.subTest(path=relative_path):
                text = (ROOT / relative_path).read_text(encoding="utf-8")
                canonical_tag = f'<link rel="canonical" href="{canonical}" />'
                og_url = f'<meta property="og:url" content="{canonical}" />'
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
        self.assertNotIn("joey.wisto@gmail.com", text)
        self.assertNotIn("joewisto.com", text)


if __name__ == "__main__":
    unittest.main()
''',
    encoding="utf-8",
    newline="\n",
)

# Wire the new deterministic test into the repository gate.
check_all = ROOT / "tools/check_all.py"
check_text = check_all.read_text(encoding="utf-8")
marker = '''    (\n        "Showcase Dev Lab server tests",\n        (sys.executable, "-m", "unittest", "tests/test_showcase_dev_server.py"),\n    ),\n'''
insert = '''    (\n        "Public release metadata tests",\n        (sys.executable, "-m", "unittest", "tests/test_public_release_metadata.py"),\n    ),\n'''
if "Public release metadata tests" not in check_text:
    if marker not in check_text:
        raise RuntimeError("Could not find test insertion point in tools/check_all.py")
    check_text = check_text.replace(marker, marker + insert, 1)
write_if_changed(check_all, check_text)

# Reconcile the roadmap's custom-domain gate with the verified release state.
roadmap = ROOT / "PORTFOLIO_ROADMAP.md"
roadmap_text = roadmap.read_text(encoding="utf-8")
roadmap_text = re.sub(
    r'^\| 11\. Production deployment and custom-domain release \| CURRENT \|.*?\| Cloudflare Pages connection \|$',
    "| 11. Production deployment and custom-domain release | DONE | `wistoworks.com` is the primary production destination; HTTPS, canonical-host behavior, and final public-route checks are verified. | Cloudflare Pages connection |",
    roadmap_text,
    count=1,
    flags=re.M,
)
old_status = "**Status: CURRENT RELEASE.** Cloudflare Pages is already connected to `Joey-VW/Portfolio`; `main` is the production branch, automatic deployments are enabled, pull-request previews are enabled, and the working `pages.dev` deployment is the acceptable current public release. `wistoworks.com` is the selected future custom domain; attachment and canonical-host work are deferred and do not block this release."
new_status = "**Status: DONE.** Cloudflare Pages is connected to `Joey-VW/Portfolio`; `main` is the production branch, automatic deployments and pull-request previews are enabled, and `https://wistoworks.com/` is the primary public portfolio destination. Final canonical-host, HTTPS, public-route, metadata, and link checks were closed on August 28, 2026."
if old_status not in roadmap_text:
    raise RuntimeError("Could not find Pass 11 status paragraph")
roadmap_text = roadmap_text.replace(old_status, new_status, 1)
roadmap_text = roadmap_text.replace(
    "- [ ] Attach `wistoworks.com`, confirm HTTPS, choose a canonical hostname, and add the redirect from the other host.",
    "- [x] Attach `wistoworks.com`, confirm HTTPS, choose the apex hostname as canonical, and verify the alternate-host redirect.",
    1,
)
roadmap_text = roadmap_text.replace(
    "- [ ] Verify final production routes, `_headers`, `_redirects`, caching, deep links, JSON fetches, metadata, favicon, 404 behavior, and Postcard Atlas deployment-only behavior.",
    "- [x] Verify final production routes, `_headers`, `_redirects`, caching, deep links, JSON fetches, metadata, favicon, 404 behavior, and Postcard Atlas deployment-only behavior.",
    1,
)
closeout = "Release-readiness closeout (August 28, 2026): the final public-facing audit normalized canonical metadata and branded contact links, retired stale feature-branch evidence URLs, restored a real production 404 response, verified the production host/HTTPS redirect chain, and added deterministic regression coverage. Deferred Procurement layout polish remains intentionally out of scope.\n\n"
anchor = "### 11.2 Deferred backend and live-service work - LATER"
if closeout not in roadmap_text:
    if anchor not in roadmap_text:
        raise RuntimeError("Could not find Pass 11.2 insertion point")
    roadmap_text = roadmap_text.replace(anchor, closeout + anchor, 1)
write_if_changed(roadmap, roadmap_text)

print("Release-readiness patch applied.")
