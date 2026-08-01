# Joe Wisto Portfolio Hub

A plain HTML/CSS/JavaScript technical portfolio hub for analytics, automation, systems, BI, reporting workflows, and project case studies for **Joe Wisto | Analytics, Automation, Systems & BI**. The homepage still works as a recruiter-friendly professional snapshot and print-to-PDF resume, while `/projects` introduces the first version of a broader case-study hub.

This is the clean active portfolio repository. `PORTFOLIO_ROADMAP.md` is the implementation-status source of truth. Some backend and live-service integrations remain intentionally deferred; fixture-based demos and disabled submission behavior must describe those limits truthfully.

## Toolchain setup

Repository tooling supports Node 24, npm 11, Python 3.12, and uv. Install the locked JavaScript and core Python development environments from a clean checkout:

```bash
npm ci
uv sync --dev --locked
```

Optional Python tool families stay outside the default merge gate:

```bash
uv sync --extra capture       # Playwright and Pillow; browser install is separate
uv sync --extra transit       # GTFS-Realtime inspection tools
uv sync --extra bigquery      # Optional Procurement BigQuery publishing
```

The supported root checks are:

```bash
npm run format:check
npm run lint
npm run validate
npm run test
npm run build
npm run validate:dist
npm run test:dist
npm run check
```

Credentialed Kroger and transit operations, browser capture, BigQuery writes, and deployments are intentionally excluded from the default merge gate.

GitHub Actions runs the same deterministic gate for pull requests and relevant pushes. The Kroger observation workflow remains separate, credential-gated, and unchanged by the general CI workflow.

Initial JSON Schemas live in `schemas/` and are enforced by:

```bash
python tools/validate_json_contracts.py
```

The contract validator checks the project registry, Showcase configuration, PHX Transit synthetic fixtures, EV True Cost data, Shrinkflation browser data, and the generated Procurement and Quote-to-Cash artifacts. It also verifies registry/noindex consistency, route existence, public featured Showcase metadata, and obvious secrets or local absolute paths in deployable inputs.

## Local preview

Run a small static server from the repository root when checking source files directly:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

The approved Pass 16 production-build proof generates a clean `dist/` artifact without changing the current Cloudflare production output directory:

```bash
npm run build
npm run validate:dist
npm run test:dist
```

Serve the generated artifact when validating deployment parity:

```bash
python -m http.server 4173 --bind 127.0.0.1 --directory dist
python tools/smoke_static_routes.py --base-url http://127.0.0.1:4173
```

### Showcase Dev Lab saves

Use the dedicated local server only when you need Dev Lab changes to become a repository-backed default:

```bash
python tools/serve_showcase_dev.py
```

Open the printed localhost URL, enable or open Showcase Dev Lab through its approved local debug mechanism, adjust controls, select **Save**, review the Git diff for `data/showcase-config.json`, and commit the JSON change through the normal Git workflow. `python -m http.server` can preview the committed saved configuration but cannot process Dev Lab saves. Production remains static and only reads the committed JSON.

Key routes:

- `/` - homepage resume/professional snapshot
- `/projects/` - project index rendered from `data/projects.json`
- `/games/colony-ops-lab.html` - playable colony telemetry experiment
- `/games/gravity-fleet-lab.html` - playable orbital RTS telemetry experiment
- `/projects/shrinkflation-tracker.html` - consumer analytics prototype for unit-price changes
- `/projects/ev-true-cost.html` - EV public-charging cost check for public, mostly-home, and home-only charging
- `/projects/procurement-kpi-analysis.html` - hidden, noindex supplier-priority case study built from a validated procurement metric layer
- `/projects/quote-to-cash-workflow-audit.html` - hidden, noindex deterministic fictional audit of CRM, billing, and revenue-recognition handoffs
- `/projects/phx-transit-pulse.html` - public synthetic operations console with a real Phoenix-area basemap, fictional transit overlays, deterministic replay, accessible records, and a schematic fallback; supporting feasibility and implementation documents live under `docs/phx-transit/`.
- `/projects/multi-platform-publishing-system.html` - public-ready Multi-Platform Publishing System case study (currently noindex; final indexing decision is part of the production release)
- `/projects/multi-platform-publishing-system/demo/` - public-ready Postcard Atlas fictional publishing-system demo (currently noindex; final indexing decision is part of the production release)

## Project structure

```text
index.html                         # Portfolio homepage + resume snapshot
styles.css                         # Futuristic visual system, project cards, case-study pages, print rules
script.js                          # Print button, reactive panel light, JSON-driven project cards
data/projects.json                 # Source of truth for project cards
data/*-sample-runs.json             # Mock benchmark data for interactive game dashboards
data/ev-true-cost.json              # Public, source-aware EV operating-cost foundation data
data/procurement-source.csv         # Preserved source input for the Procurement case study
data/procurement-kpi-analysis.json  # Generated Procurement browser artifact
data/quote-to-cash-workflow-audit.json # Generated fictional QTC audit artifact
projects/index.html                # Projects hub
projects/*.html                    # Individual case-study pages
projects/multi-platform-publishing-system/demo/ # Self-contained Postcard Atlas demo
games/*.html/css/js                 # Frontend-only playable portfolio experiments
assets/docs/                       # Future PDFs or supporting docs
assets/img/favicon.svg             # Basic favicon
assets/img/projects/               # Future project imagery
assets/img/og/                     # Future Open Graph/Twitter preview images
_headers                           # Cloudflare Pages headers
_redirects                         # Cloudflare Pages redirects
package.json / package-lock.json   # Root npm commands and locked JavaScript tooling
pyproject.toml / uv.lock           # Python dependencies and locked environments
tools/check_all.py                 # Cross-platform deterministic check orchestration
tools/validate_json_contracts.py   # Initial JSON Schema and repository contract checks
tools/build_site.mjs               # Vite multi-page build and reviewed static-copy step
tools/validate_dist.mjs            # Build-output allowlist, denylist, route, and fetch checks
docs/architecture/                 # Current route, deployment, and validation baselines
docs/decisions/                    # Architecture decision records
schemas/                           # Initial JSON Schemas for browser-readable contract data
```

## Print-to-PDF resume behavior

Use the **Print / PDF** button or press `Ctrl + P` from the homepage. The print stylesheet keeps the resume-oriented homepage compact, removes ambient effects and navigation, and avoids printing portfolio-only case-study pages.

## Deployment: Cloudflare Pages

Cloudflare Pages is connected to this repository. `main` is the production branch, automatic deployments and pull-request previews are enabled, and production builds and publishes only the generated `dist/` artifact. Custom-domain attachment and canonical-host redirect remain open; see `PORTFOLIO_ROADMAP.md` for the current completion status.

Repository settings:

- Framework preset: **None**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

Pass 16.4 completed the production cutover on August 1, 2026. Rollback restores build command `exit 0` and output directory `/`, keeps framework **None** and the repository root, then redeploys the last known-good `main` commit. Do not manually patch generated `dist/` contents.

The included `_headers` file adds basic security headers and cache rules. The `_redirects` file preserves simple legacy routes such as `/resume` and `/home`.

## Updating projects

Edit `data/projects.json` to update cards rendered on the homepage and project index. Add or update the matching static case-study HTML file in `projects/` for detailed writeups.

Every project entry must include:

- `createdAt` as the original project creation date in `YYYY-MM-DD` format
- `status` as `ready`, `in-progress`, or `planned`
- `visibility` as `public` or `hidden`

Only entries with valid lifecycle metadata, `status: "ready"`, and `visibility: "public"` are published. Homepage and Showcase selection also requires `featured: true`. All public consumers use the same newest-first order, with title as the tie-breaker.

Validate lifecycle metadata, local routes, and `noindex` coverage with Python. When Node is available, also run the dependency-free runtime helper check:

```bash
python tools/validate_project_registry.py
node tools/validate_project_registry_runtime.js
```

## EV true-cost foundation workflow

`/projects/ev-true-cost.html` is a static consumer analytics case study for comparing a 2018 Honda Pilot gasoline benchmark with a confirmed 2026 Kia EV9 Light Long Range RWD configuration. It leads with the household story, a confirmed public fast-charging receipt, and a conditional answer: public charging costs more in the seed model, while mostly-home and home-only charging flip the result. Results are derived in-browser from `data/ev-true-cost.json` and current form state; the committed JSON preserves source/provenance metadata for confirmed, owner-reported, benchmark, mock, and planned inputs.

The public charging default is recomputed from the confirmed receipt (`$30.08 / 49.6 kWh`). Home electricity and home-charger installation cost are temporary mock assumptions. Owner-only acquisition/sale context is intentionally excluded from the public browser JSON; keep future sensitive working inputs in local-only files until publication is approved. The foundation release is not live data and does not claim a total ownership model.

Useful command:

```bash
python tools/validate_ev_true_cost.py
```

## Legacy analytics modernization workflows

The Procurement case study preserves its retrieved source CSV, applies blocking contract checks plus measured audit exceptions, and generates the static browser artifact from one maintained metric layer:

```bash
python tools/procurement/build_case_data.py
python tools/procurement/validate_case_data.py
```

BigQuery remains an optional documented destination and is not required to view or reproduce the browser output. See `docs/procurement/` for provenance, the data contract, and the metric dictionary.

The Quote-to-Cash case study creates separate fictional CRM, billing, and revenue entities with fixed seed `20250630`, then measures stage-specific conversion, timing, and workflow exceptions:

```bash
python tools/qtc/build_case_data.py
python tools/qtc/validate_case_data.py
```

Optional generated source CSVs can be written with `python tools/qtc/generate_mock_data.py`. See `docs/qtc/` for the entity contract, cohort definitions, audit rules, and scenario limits.

Focused automated coverage for both workflows and the shared dataframe inspector:

```bash
python -m unittest tests/test_analytics_modernization.py
```

## Shrinkflation live-data workflow

The Shrinkflation Tracker intentionally separates curated demo history from official Kroger/Fry’s API observations. `quarterlyHistory` remains mock/demo data for the portfolio case-study curves, while `apiMatches` and `observations` accumulate source-aware live records for future trend detection. The frontend is static and only reads committed JSON; Kroger credentials stay local/server-side and are never exposed to browser JavaScript.

Useful commands:

```bash
python tools/fetch_kroger_products.py --dry-run --limit 3
python tools/fetch_kroger_products.py --write-staging --limit 3
python tools/fetch_kroger_products.py --apply-observations
python tools/fetch_kroger_products.py --from-staging data/shrinkflation-products.kroger-staging.json --apply-observations --dry-run
python tools/fetch_kroger_products.py --dry-run --limit 3 --review-matches
python tools/fetch_kroger_products.py --test-merge-fixture
```

To prevent search-result drift over time, review candidate matches and lock stable products in `data/shrinkflation-api-targets.json` with `preferredProductId` or `preferredUpc`.

## Future roadmap

- Add real project screenshots and OG preview images.
- Add downloadable resume and project one-pagers under `assets/docs/`.
- Add richer case-study metrics, diagrams, and links to live demos where appropriate.
- Keep fixture-based and disabled behaviors truthful while live Sheets, Forms, Drive, and contact delivery remain deferred.
- Replace the `mailto:` contact form with a verified Cloudflare Worker or form endpoint when backend work is prioritized.
- Keep the browser application static and multi-page. Complete Cloudflare preview approval before any separate Cloudflare output-directory cutover.

