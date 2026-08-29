#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "projects/phx-transit-pulse.html": "https://wistoworks.com/projects/phx-transit-pulse",
    "projects/shrinkflation-tracker.html": "https://wistoworks.com/projects/shrinkflation-tracker",
    "games/gravity-fleet-lab.html": "https://wistoworks.com/games/gravity-fleet-lab",
    "projects/procurement-kpi-analysis.html": "https://wistoworks.com/projects/procurement-kpi-analysis",
    "projects/quote-to-cash-workflow-audit.html": "https://wistoworks.com/projects/quote-to-cash-workflow-audit",
    "projects/multi-platform-publishing-system.html": "https://wistoworks.com/projects/multi-platform-publishing-system",
    "projects/ev-true-cost.html": "https://wistoworks.com/projects/ev-true-cost",
}

for relative, clean_url in PAGES.items():
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    html_url = f"{clean_url}.html"
    canonical_old = f'<link rel="canonical" href="{html_url}" />'
    canonical_new = f'<link rel="canonical" href="{clean_url}" />'
    og_old = f'<meta property="og:url" content="{html_url}" />'
    og_new = f'<meta property="og:url" content="{clean_url}" />'
    if text.count(canonical_old) != 1 or text.count(og_old) != 1:
        raise RuntimeError(f"Unexpected canonical metadata in {relative}")
    text = text.replace(canonical_old, canonical_new, 1).replace(og_old, og_new, 1)
    path.write_text(text, encoding="utf-8", newline="\n")

# The public registry intentionally keeps source-file hrefs with .html; Cloudflare Pages
# exposes the corresponding clean URL as the final production URL. Canonical metadata
# therefore strips the source extension for project pages.
test_path = ROOT / "tests/test_public_release_metadata.py"
test = test_path.read_text(encoding="utf-8")
old = '''                href = project["href"]\n                pages[href.lstrip("/")] = f"{ORIGIN}{href}"\n'''
new = '''                href = project["href"]\n                canonical_path = href.removesuffix(".html")\n                pages[href.lstrip("/")] = f"{ORIGIN}{canonical_path}"\n'''
if old not in test:
    raise RuntimeError("Could not find public project canonical test mapping")
test_path.write_text(test.replace(old, new, 1), encoding="utf-8", newline="\n")

print("Clean production canonical metadata applied.")
