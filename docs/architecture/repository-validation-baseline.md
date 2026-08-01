# Repository Validation Baseline

## Baseline environment

- Commit: `78b03c0a008a802cec3281334beaefe2b58efb13`
- Recorded: July 31, 2026
- Node: 24.14.0
- npm: 11.9.0
- Python: 3.12.13
- Platform used for this record: Linux

All commands were run from the repository root without live credentials. The connected repository and current `main` were inspected directly; the older repository pack was used only as a file-list cross-check.

## Existing deterministic checks

| Command                                                      | Exit | Baseline result                                                            |
| ------------------------------------------------------------ | ---: | -------------------------------------------------------------------------- |
| `python tools/validate_project_registry.py`                  |    0 | 10 entries; 5 publishable and 5 unlisted                                   |
| `node tools/validate_project_registry_runtime.js`            |    0 | Lifecycle and ordering pass; expected VM warning because `fetch` is absent |
| `python tools/validate_ev_true_cost.py`                      |    0 | Passed                                                                     |
| `python tools/validate_phx_transit_map.py`                   |    0 | Passed: 5 routes, 14 stops, 130 progress records, 32 alert segments        |
| `node tools/validate_gravity_fleet.js`                       |    0 | Passed after restoring the established 10 percent effective orbit contract |
| `python tools/procurement/validate_case_data.py`             |    0 | Passed                                                                     |
| `python tools/qtc/validate_case_data.py`                     |    0 | Passed                                                                     |
| `python -m unittest tests/test_analytics_modernization.py`   |    0 | 13 tests passed                                                            |
| `python tools/fetch_kroger_products.py --test-merge-fixture` |    0 | Fixture checks passed; negative fixtures emitted expected safe summaries   |

## Resolved branch correction

`tools/validate_gravity_fleet.js` expects each level's effective orbit speed to be exactly 10 percent above the previous level. Repository history clearly establishes that contract:

- Commit `62a38729e5d4579afb7b724e4f1649e5da3ceaf7` set the level multipliers to `1`, `1.10`, and `1.21`.
- Commit `f59edd4c348e80a36fb44fb5e0a372887956f1f7` refined the validator to assert effective per-path speeds.

The modernization branch had regressed the multipliers to `2.5` and `4`. Pass 16.1 restores the established multipliers instead of suppressing the validator.

## Disposable build-tool proof

Vite 8.2.0 built all 19 tracked HTML inputs in 374 ms after a temporary proof configuration enumerated the entries and copied control/data paths. The proof was not committed and did not change Cloudflare settings. It identified three requirements for Pass 16.3:

1. Copy classic non-module scripts explicitly or migrate them in focused slices.
2. Copy only reviewed browser data and media, including the Postcard Atlas manifest/video family.
3. Assert route shapes plus `_headers` and `_redirects` presence in generated output.

## Pass 16.1 command mapping

| Root command           | Existing checks represented                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | Python byte compilation, Ruff on the new orchestration boundary, and Node syntax checks for repository JS/MJS/CJS |
| `npm run validate`     | The seven existing project and generated-data validators                                                          |
| `npm run test`         | Analytics unit tests and the offline Kroger merge fixture                                                         |
| `npm run format:check` | Prettier check limited to new foundation JSON and Markdown                                                        |
| `npm run check`        | Format, lint, validate, and test in that order                                                                    |

Credentialed Kroger fetching, live transit fetching, browser capture, BigQuery publishing, and Cloudflare deployment are excluded from `npm run check`.

## Foundation verification

- `npm ci --ignore-scripts` installed the exact locked Prettier dependency.
- `uv sync --dev --locked` created the Python 3.12 environment from `uv.lock` and enforced lock consistency for the core/dev dependency set.
- `npm run format:check` passed.
- `npm run lint` passed Python compilation, the foundation Ruff scope, and syntax checks for every committed JS, MJS, and CJS file.
- `npm run test` passed 13 unit tests and the offline Kroger merge fixture.
- A local HTTP smoke returned 200 for all 19 HTML routes plus 16 critical data, script, stylesheet, module, and Cloudflare-control targets (35 of 35 total).
- `npm run validate` passed after the Gravity Fleet orbit-speed correction.

## Rerun expectations

- `npm run lint` and `npm run format:check` should pass after the locked development dependencies are installed.
- `npm run test` should pass offline.
- `npm run validate` and `npm run check` should pass in the locked default environment.
- A new failure in any previously passing command is a migration regression.
- Windows installation and Cloudflare rendered QA remain external verification gates; neither is claimed by this Linux baseline.
