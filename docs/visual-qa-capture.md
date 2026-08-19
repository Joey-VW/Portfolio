# Portfolio Visual QA Capture

`tools/visual_qa_capture.py` creates a repeatable screenshot bundle for visual review of the public portfolio.

## What it captures

The default run discovers:

- the homepage;
- the projects index;
- every project whose `data/projects.json` entry has `visibility: "public"`;
- the public Multi-Platform Publishing System demo pages, excluding its `404.html`.

Primary portfolio pages use six viewports:

- 1440×1000
- 1280×900
- 1024×768
- 768×1024
- 430×932
- 390×844

Publishing demo subpages use the desktop, tablet, and 390px phone viewports to keep the artifact useful without multiplying redundant captures.

For every page/viewport combination the utility records:

- a native full-page PNG for context;
- contiguous viewport-sized PNG slices for detailed visual inspection;
- page/console/request diagnostics;
- horizontal page overflow;
- broken images;
- suspicious viewport escapes and clipped-overflow candidates.

Later viewport slices temporarily hide visible fixed/sticky elements so persistent headers and controls are not repeated through every section.

## Output

A run writes to `visual-qa-output/` by default. That directory is gitignored.

Each timestamped run contains:

```text
visual-qa-YYYYMMDD-HHMMSSZ/
├── manifest.json
├── report.html
└── pages/
    └── <page>/
        └── <viewport>/
            ├── full.png
            ├── diagnostics.json
            └── slices/
                ├── slice-001.png
                └── ...
```

Unless `--no-zip` is passed, the utility also creates a sibling ZIP containing the complete run directory.

`report.html` is a lightweight local index. `manifest.json` is the machine-readable source of truth for downstream review.

## Local setup

The repository already defines the `capture` dependency extra:

```powershell
uv sync --extra capture
uv run playwright install chromium
```

Capture the deployed site:

```powershell
uv run python tools/visual_qa_capture.py
```

Capture a local server instead:

```powershell
uv run python tools/visual_qa_capture.py --base-url http://127.0.0.1:8000
```

Run only one or more target slugs while debugging:

```powershell
uv run python tools/visual_qa_capture.py --only procurement-kpi-analysis
uv run python tools/visual_qa_capture.py --only phx-transit-pulse --only ev-true-cost
```

Add a one-off route without changing the registry:

```powershell
uv run python tools/visual_qa_capture.py --route /some-page.html
```

Use `--headed` to watch Chromium during a local run. Use `--no-demo` to skip publishing-demo subpages.

## GitHub Actions handoff

`.github/workflows/visual-qa-capture.yml` exposes a manual **Visual QA Capture** workflow.

The workflow:

1. checks out the selected ref;
2. installs the repository's capture dependencies and Chromium;
3. runs the same capture utility against the requested base URL;
4. creates the ZIP locally in the runner;
5. uploads the ZIP as a GitHub Actions artifact retained for 14 days.

The workflow continues through individual page/viewport capture failures so the bundle can preserve the evidence, but the capture step returns a failure when any capture failed. The artifact-upload step runs even after that failure.

The artifact is intentionally not committed to `main` or another long-lived branch. This avoids permanent binary screenshot history while still making each QA run retrievable from the repository's Actions history.

## Review contract

A visual review should use both layers:

- `manifest.json` and each `diagnostics.json` for objective browser/DOM signals;
- the viewport slices for actual visual judgment such as clipping, overlap, hierarchy, spacing, wrapping, chart readability, responsive degradation, and visually broken states.

The full-page PNGs provide page context; the slices are the preferred source for pixel-level inspection because they retain native viewport resolution instead of compressing a very tall page into one preview.
