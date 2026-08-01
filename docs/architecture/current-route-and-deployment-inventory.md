# Current Route and Deployment Inventory

## Baseline

- Repository: `Joey-VW/Portfolio`
- Baseline branch: `main`
- Baseline commit: `0e08de6a1c6be5e643703a3f651dbf1b8a8f0a33`
- Recorded: July 31, 2026
- Current host model: Cloudflare Pages serves the repository root with no production build.

This inventory records the current static site contract before a generated `dist/` boundary is introduced. It does not authorize route moves, source moves, or deployment changes.

## HTML route inventory

| Route                                                          | Source                                                      | Publication role                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `/`                                                            | `index.html`                                                | Public homepage, resume, project cards, and Showcase |
| `/projects/`                                                   | `projects/index.html`                                       | Public project index                                 |
| `/projects/phx-transit-pulse.html`                             | `projects/phx-transit-pulse.html`                           | Public and ready                                     |
| `/projects/ev-true-cost.html`                                  | `projects/ev-true-cost.html`                                | Public and ready                                     |
| `/projects/shrinkflation-tracker.html`                         | `projects/shrinkflation-tracker.html`                       | Public and ready                                     |
| `/games/gravity-fleet-lab.html`                                | `games/gravity-fleet-lab.html`                              | Public and ready                                     |
| `/projects/multi-platform-publishing-system.html`              | `projects/multi-platform-publishing-system.html`            | Public and ready, but still `noindex`                |
| `/projects/multi-platform-publishing-system/demo/`             | `projects/multi-platform-publishing-system/demo/index.html` | Public nested demo                                   |
| `/projects/multi-platform-publishing-system/demo/about.html`   | matching HTML                                               | Public nested demo page                              |
| `/projects/multi-platform-publishing-system/demo/ask.html`     | matching HTML                                               | Public nested demo page                              |
| `/projects/multi-platform-publishing-system/demo/journal.html` | matching HTML                                               | Public nested demo page                              |
| `/projects/multi-platform-publishing-system/demo/map.html`     | matching HTML                                               | Public nested demo page                              |
| `/projects/multi-platform-publishing-system/demo/photos.html`  | matching HTML                                               | Public nested demo page                              |
| `/projects/multi-platform-publishing-system/demo/404.html`     | matching HTML                                               | Nested demo fallback page                            |
| `/games/colony-ops-lab.html`                                   | `games/colony-ops-lab.html`                                 | Ready, hidden, and `noindex`                         |
| `/projects/procurement-kpi-analysis.html`                      | matching HTML                                               | In progress, hidden, and `noindex`                   |
| `/projects/quote-to-cash-workflow-audit.html`                  | matching HTML                                               | In progress, hidden, and `noindex`                   |
| `/projects/cfpb-complaint-intelligence.html`                   | matching HTML                                               | In progress, hidden, and `noindex`                   |
| `/projects/video-cutter-lite.html`                             | matching HTML                                               | In progress, hidden, and `noindex`                   |

Publication state is determined by `data/projects.json`, not by route presence. A static route is unlisted, not private.

## Redirect contract

| Incoming route     | Destination            | Status |
| ------------------ | ---------------------- | ------ |
| `/resume`          | `/`                    | 301    |
| `/home`            | `/`                    | 301    |
| `/projects/:slug/` | `/projects/:slug.html` | 301    |

The route manifest used by a future build must preserve these rules and copy `_redirects` to the output root.

## Browser data and runtime dependency inventory

| Consumer                          | Required local paths                                                                                                                          | External or dynamic dependency                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Homepage, project index, Showcase | `/data/projects.json`, `/data/showcase-config.json`, `/script.js`, `/styles.css`                                                              | None required for registry rendering                                                                   |
| PHX Transit Pulse                 | `/data/phx-transit/synthetic/operations-replay.json`, `/data/phx-transit/synthetic/state-scenarios.json`, project CSS and two classic scripts | MapLibre 5.24 from unpkg; the page includes a schematic fallback                                       |
| Gravity Fleet                     | `/games/gravity-fleet-lab.js`, six `.mjs` modules, `/data/gravity-fleet-sample-runs.json`                                                     | Browser storage only                                                                                   |
| Colony Ops                        | `/games/colony-ops-lab.js`, `/data/colony-sample-runs.json`                                                                                   | Browser storage only                                                                                   |
| Shrinkflation Tracker             | `/data/shrinkflation-products.json`                                                                                                           | Product image URLs may be external; the UI has fallbacks                                               |
| EV True Cost                      | `/data/ev-true-cost.json`                                                                                                                     | None                                                                                                   |
| Procurement                       | `/data/procurement-kpi-analysis.json`                                                                                                         | Links to three files under `/docs/procurement/`                                                        |
| Quote-to-Cash                     | `/data/quote-to-cash-workflow-audit.json`                                                                                                     | Links to three files under `/docs/qtc/`                                                                |
| Postcard Atlas                    | nested HTML, CSS, ES modules, CSV files, background image, video manifest, and 18 local videos                                                | Optional Google Sheets, Drive, and Forms URLs; Leaflet 1.9.4 on the map page; static-content fallbacks |

No Web Worker construction was found. Root-relative `/assets`, `/data`, `/games`, and `/projects` paths and Postcard Atlas relative paths are part of the compatibility contract.

## Deployment classification

The current root deployment makes tracked source and evidence reachable unless Cloudflare ignores it. A future `dist/` build must use an allowlist rather than copy the repository wholesale.

| Path family                                                       | Classification                         | Required treatment                                                                                        |
| ----------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `index.html`, `script.js`, `styles.css`                           | Required in production                 | Preserve root URLs                                                                                        |
| `_headers`, `_redirects`                                          | Required in production                 | Copy unchanged to `dist/` root                                                                            |
| `assets/img/`, `assets/css/`                                      | Required in production                 | Copy or fingerprint with rewritten references                                                             |
| `assets/docs/archive/`                                            | Source/archive only                    | Exclude unless a route intentionally links it                                                             |
| `games/`                                                          | Mixed                                  | Publish browser HTML, CSS, JS, and modules; keep future tooling out                                       |
| `projects/`                                                       | Mixed                                  | Publish page assets and Postcard Atlas runtime content; exclude nested development tools and ignore files |
| `data/projects.json`, `data/showcase-config.json`                 | Browser-safe production data           | Publish                                                                                                   |
| `data/ev-true-cost.json`, generated analytics JSON, sample runs   | Browser-safe production data           | Publish with source traceability                                                                          |
| `data/phx-transit/synthetic/`                                     | Browser-safe synthetic production data | Publish and preserve synthetic labeling                                                                   |
| `data/phx-transit/verification/`                                  | Verification evidence                  | Exclude from `dist/`                                                                                      |
| `data/procurement-source.csv`                                     | Generator source                       | Exclude from `dist/`                                                                                      |
| `data/shrinkflation-api-targets.json`                             | Tooling input                          | Exclude unless a future browser use is approved                                                           |
| `docs/procurement/`, `docs/qtc/`                                  | Currently browser-linked documentation | Preserve until links are intentionally redesigned                                                         |
| Remaining `docs/`, `sql/`, `tests/`, `tools/`                     | Source, tests, or tooling              | Exclude from `dist/`                                                                                      |
| `.github/`, `.env.example`, `.gitignore`, agent and roadmap files | Repository-only                        | Exclude from `dist/`                                                                                      |
| `package*.json`, `pyproject.toml`, `uv.lock`, version files       | Repository tooling                     | Exclude from `dist/`                                                                                      |

## Representative behavior baseline

- The homepage and project index fail closed on invalid lifecycle values and sort publishable projects newest first.
- Showcase uses the same registry and adds `featured: true` plus `data/showcase-config.json`.
- Homepage print CSS removes interactive portfolio chrome while retaining the resume-oriented content.
- PHX Transit loads deterministic synthetic replay data, supports replay, filters, selection, reduced motion, and a schematic map fallback.
- Gravity Fleet shares one deterministic engine across its desktop and mobile presentations and loads benchmark sample data separately.
- Shrinkflation, EV, Procurement, and Quote-to-Cash render committed browser JSON and expose understandable error states when fetches fail.
- Postcard Atlas keeps its nested relative URLs, static fallbacks, media manifest, deep links, and optional external content sources.

## Vite compatibility study

A disposable Vite 8.2.0 multi-page proof was run against all 19 HTML entries on Node 24.14.0. It completed successfully and preserved nested HTML output, processed Postcard Atlas ES modules, and accepted Gravity Fleet `.mjs` imports. `_headers`, `_redirects`, and `data/` were copied by a temporary proof plugin.

The proof also produced actionable warnings: classic scripts without `type="module"` are not bundled automatically, root-relative runtime files require an explicit copy policy, and Postcard Atlas media must be copied from an approved manifest. Vite is therefore approved in principle for Pass 16.3, conditional on explicit entries, an allowlisted static-copy step, route/output assertions, and no production cutover in the same pass.

## Known contradictions and follow-up questions

- Multi-Platform Publishing System is public and ready but intentionally remains `noindex`; Pass 16.2 should encode the approved exception or resolve it before enforcing public-route indexing consistency.
- README route copy had not caught up with the PHX Transit publication state at the baseline and is corrected as documentation in Pass 16.1.
- The current root deployment exposes more source and evidence than the future production boundary should contain.
- External unpkg, Google, Drive, Forms, and product-image dependencies require deterministic fallbacks and later browser coverage; they must not become build-time requirements.
- Pass 16.3 must decide whether classic scripts remain copied assets or migrate individually to modules. A repository-wide module conversion is not implied.
