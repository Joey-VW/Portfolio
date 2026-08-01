# Repository Architecture Modernization Roadmap

> Program intent: give the portfolio a professional build, validation, and deployment foundation without replacing its successful static multi-page architecture or rewriting working projects.

- Proposed portfolio pass: **Pass 16 - Repository architecture modernization**
- Status: **IN PROGRESS - Pass 16.0 complete; Pass 16.1 implemented with one recorded baseline blocker**
- Prepared: July 31, 2026
- Baseline reviewed: `main` at `e1f8867` (`Publish PHX Transit Pulse and add Showcase animation (#37)`)
- Primary implementation tracker: this document
- Related sources of truth: `AGENTS.md`, `PORTFOLIO_ROADMAP.md`, `README.md`, `data/projects.json`

## 1. Executive recommendation

Modernize this repository as a static multi-page application with a professional tooling layer. Do not turn it into a traditional server backend and do not rewrite it in React, Next.js, or another application framework merely to appear modern.

The desired outcome is:

1. One documented command surface for development, validation, testing, formatting, and production builds.
2. Reproducible JavaScript and Python environments with committed manifests and lockfiles.
3. One automated pull-request quality gate that runs the repository's existing validators before adding broader checks.
4. A strict production boundary in which Cloudflare Pages publishes only generated `dist/` contents.
5. Clear separation between browser-safe artifacts, data-generation inputs, test fixtures, and verification evidence.
6. Machine-readable data contracts for recurring JSON formats.
7. Smaller modules organized around responsibilities, introduced through focused refactors after the build boundary is stable.
8. Browser, accessibility, route, and output checks that make regressions visible before merge.

This is an incremental migration. Existing public routes, visual behavior, data truthfulness, static hosting, and browser compatibility remain the product contract throughout the program.

## 2. Why this is the next leap

The repository already contains stronger engineering than its current structure advertises:

- deterministic fixtures and generated analytical artifacts;
- Python and Node validators;
- project-specific data contracts and methodology documentation;
- a guarded Kroger update workflow;
- modular simulation code for Gravity Fleet;
- a project lifecycle registry shared by public surfaces; and
- repeatable capture and validation utilities.

The remaining weakness is repository-wide coordination. Today, contributors must know several independent commands, dependencies are not declared in a unified way, most of the repository can fall inside the deployment tree, and large source files have accumulated multiple responsibilities. A professional foundation should expose and protect the engineering that already exists instead of replacing it.

## 3. Scope

### In scope

- Root JavaScript and Python dependency manifests and lockfiles.
- A small root command surface such as `dev`, `build`, `format`, `lint`, `test`, `validate`, and `check`.
- General GitHub Actions CI in addition to the existing Kroger workflow.
- Initial JSON Schemas and contract validation.
- A Vite multi-page build, or an equivalently lightweight static build if discovery disproves Vite's fit.
- A generated `dist/` directory as the only production artifact.
- A safe Cloudflare Pages output-directory migration.
- Separation of deployable and non-deployable data.
- Consistent substantial-project structure and project README expectations.
- Focused modularization of root site code, PHX Transit Pulse, and Gravity Fleet.
- Browser smoke tests, accessibility checks, route verification, and optional performance budgets.
- Documentation cleanup and lightweight architecture decision records.

### Out of scope

- A persistent database, server application, or API unless a future product feature genuinely requires one.
- A framework rewrite.
- A portfolio visual redesign.
- Rebuilding stable projects during the build migration.
- Converting the entire repository to TypeScript in one pass.
- Splitting projects into separate repositories.
- Replacing Cloudflare Pages.
- Shipping live provider ingestion for PHX Transit.
- Changing analytical conclusions or synthetic-data labeling except where a contract defect is found.
- Completing unrelated product-roadmap passes under cover of structural work.

## 4. Non-negotiable migration contracts

Every implementation pass must preserve these contracts unless a later, explicitly approved decision record changes one.

### Product behavior

- Existing public URLs remain stable, including nested routes and legacy redirects.
- The homepage, project index, and Showcase continue to derive publication state from `data/projects.json`.
- Public, ready, featured, hidden, and `noindex` behavior remain internally consistent.
- The homepage print/PDF resume remains usable.
- PHX Transit, Gravity Fleet, Shrinkflation Tracker, EV True Cost, Postcard Atlas, Procurement, and Quote-to-Cash retain their established behavior and data disclosures.
- Reduced-motion, keyboard, mobile, and fallback behaviors are not weakened.

### Architecture

- The browser remains a static client. A build step is authorized; an application server is not.
- Build output is disposable and reproducible. `dist/` is ignored by Git unless a future deployment mechanism explicitly requires otherwise.
- Source data and generators remain reviewable; generated browser artifacts remain traceable to their source and generator.
- No feature refactor is combined with the production cutover unless required to make the existing behavior build correctly.

### Safety and privacy

- Credentials and private inputs never enter browser bundles or deployable JSON.
- Verification captures, local paths, raw source material, and tooling are excluded from production unless intentionally designated public.
- Third-party packages are kept minimal and reviewed for license, maintenance, privacy, and browser impact.
- CI and builds must not require live credentialed API calls.

## 5. Target operating model

### Contributor command surface

The final names may be adjusted during Pass 16.1, but the repository should converge on this small interface:

```bash
npm run dev
npm run build
npm run format
npm run lint
npm run test
npm run validate
npm run check
```

`npm` is the cross-platform task entry point, not evidence that the portfolio has become a Node backend. Python tools remain Python. Root scripts call the correct underlying commands and preserve direct invocation for debugging.

Expected meanings:

| Command | Contract |
| --- | --- |
| `npm run dev` | Start the supported local HTTP development server. |
| `npm run build` | Produce a clean, deterministic `dist/` artifact. |
| `npm run format` | Apply configured formatting only to intentionally supported files. |
| `npm run lint` | Run static quality checks without modifying files. |
| `npm run test` | Run deterministic unit and integration tests with no live credentials. |
| `npm run validate` | Run repository, registry, route, schema, and generated-data validators. |
| `npm run check` | Run the merge gate in a documented order and finish with a production build. |

### Production data classification

| Location | Purpose | Deployed? | Examples |
| --- | --- | --- | --- |
| `public/data/` | Browser-safe static artifacts | Yes | project registry, replay fixtures intended for the UI, generated case-study data |
| `data-src/source/` | Inputs used to generate public artifacts | No by default | source CSVs, raw provider samples |
| `data-src/synthetic/` | Authored deterministic scenario inputs | Only through reviewed output | replay generation inputs |
| `data-src/fixtures/` | Tests and local demonstrations | No by default | invalid-contract fixtures, saved command sequences |
| `data-src/verification/` | Audit evidence and cadence captures | No | feed studies, screenshots, validation exports |
| `dist/` | Reproducible production artifact | This directory only | HTML, browser assets, approved public JSON, headers, redirects |

Some currently public files may remain browser-safe inputs rather than generated outputs. Classification must be decided file by file; moving a file is not proof that it is safe to deploy.

### Directional target structure

This is a destination, not a single-PR move list. Passes may keep compatibility adapters while the structure changes.

```text
/
├── src/
│   ├── site/
│   │   ├── index.html
│   │   ├── projects.html
│   │   ├── scripts/
│   │   └── styles/
│   ├── projects/
│   │   ├── phx-transit-pulse/
│   │   ├── shrinkflation-tracker/
│   │   ├── ev-true-cost/
│   │   ├── procurement-kpi-analysis/
│   │   └── quote-to-cash-workflow-audit/
│   └── games/
│       └── gravity-fleet/
├── public/
│   ├── assets/
│   ├── data/
│   ├── _headers
│   └── _redirects
├── data-src/
│   ├── source/
│   ├── synthetic/
│   ├── fixtures/
│   ├── verification/
│   └── schemas/
├── tools/
│   ├── common/
│   ├── phx-transit/
│   ├── procurement/
│   ├── qtc/
│   └── shrinkflation/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── browser/
│   └── fixtures/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── plans/
│   └── archive/
├── package.json
├── package-lock.json
├── pyproject.toml
├── vite.config.js
└── dist/                 # generated and ignored
```

## 6. Program sequence

| Pass | Status | Outcome | Production risk | Main dependency |
| --- | --- | --- | --- | --- |
| 16.0 Baseline and decisions | DONE | Behavior, routes/data, validation results, and architectural choices are recorded at `0e08de6`. | None | Current `main` stable |
| 16.1 Command and dependency foundation | IN REVIEW | Reproducible environments and one command surface are implemented; the gate exposes the pre-existing Gravity Fleet contract failure. | Low | 16.0 |
| 16.2 CI and contract foundation | BLOCKED | Turn existing checks into a required, deterministic PR gate and add initial schemas. | Low | 16.1 |
| 16.3 Parallel production-build proof | BLOCKED | Generate `dist/` and test it while production still deploys the repository root. | Medium | 16.2 |
| 16.4 Cloudflare `dist/` cutover | BLOCKED | Make `dist/` the only deployed artifact with a tested rollback path. | High | 16.3 and approved preview |
| 16.5 Source and data-boundary migration | BLOCKED | Move source into consistent locations after deployment behavior is stable. | Medium | 16.4 |
| 16.6 Focused application modularization | BLOCKED | Split large files by responsibility without redesigning features. | Medium | 16.4; 16.5 where paths overlap |
| 16.7 Browser quality gates | BLOCKED | Add route, interaction, accessibility, and optional performance checks. | Low to medium | 16.3 minimum |
| 16.8 Documentation and governance closeout | BLOCKED | Reduce duplicated status, archive history, and make the new model maintainable. | Low | 16.4-16.7 |

The critical rule is that Pass 16.3 proves the output while the old deployment remains active. Pass 16.4 changes Cloudflare only after the generated artifact has achieved functional parity.

## 7. Detailed action plan

## Pass 16.0 - Baseline and architecture decisions

### Goal

Create evidence that later passes can compare against and remove architectural ambiguity before dependencies or paths change.

### Work items

- [x] Start from the latest `main` and record the exact baseline commit.
- [x] Confirm the working tree is clean and preserve all newer merged work.
- [x] Inventory every public, hidden, redirected, and nested HTML route.
- [x] Inventory all browser fetch paths, dynamic asset references, Web Worker/module imports if any, and URL construction logic.
- [x] Build a deployment manifest that classifies each tracked top-level path as:
  - required in production;
  - source only;
  - test/tooling only;
  - verification evidence;
  - unresolved and requiring review.
- [x] Record baseline output for all existing validators and tests.
- [x] Capture or document representative behavior for:
  - homepage desktop, mobile, Showcase, and print;
  - project index;
  - PHX Transit map, replay, filters, fallback, and reduced motion;
  - Gravity Fleet desktop and mobile initialization;
  - Shrinkflation data load;
  - EV calculations;
  - Procurement and Quote-to-Cash data rendering;
  - Postcard Atlas nested routes and media loading.
- [x] Add the initial architecture decision records:
  - `0001-static-multi-page-architecture.md`;
  - `0002-project-registry-source-of-truth.md`;
  - `0003-synthetic-and-generated-data-policy.md`;
  - `0004-build-and-dist-boundary.md`.
- [x] Decide and document the supported Node and Python version policy.
- [x] Confirm whether `uv.lock` adds practical value in the target environments; otherwise use a standards-based `pyproject.toml` plus a documented lock strategy.
- [x] Confirm Vite against the difficult routes before treating it as final:
  - root and nested HTML entry points;
  - Postcard Atlas nested assets and videos;
  - root-relative `/data`, `/projects`, `/games`, and `/assets` paths;
  - `.mjs` Gravity Fleet modules;
  - `_headers` and `_redirects` propagation.

### Deliverables

- Route and deployment inventory under `docs/architecture/`.
- Four approved ADRs under `docs/decisions/`.
- A baseline validation report with known pre-existing failures separated from migration regressions.
- A decision on Vite or a documented lightweight alternative.

### Acceptance criteria

- Every current browser route and fetch path is accounted for.
- No implementation assumption depends only on the older repository pack.
- Existing checks can be rerun from documented commands.
- The chosen build tool can represent the current site without a framework conversion.
- No runtime, deployment, or public-data behavior changes in this pass.

## Pass 16.1 - Command and dependency foundation

### Goal

Make setup and validation reproducible before changing the deployment model.

### Work items

- [x] Add `package.json` and a committed `package-lock.json`.
- [x] Add `pyproject.toml` with the dependencies needed by maintained Python tools and tests.
- [x] Commit the selected Python lock artifact if Pass 16.0 approves one.
- [x] Add `.editorconfig`.
- [x] Add `.node-version` or `.nvmrc` and `.python-version` only if they match the documented environment policy.
- [x] Add root scripts that wrap current validators without changing their behavior.
- [x] Add a small Python orchestration entry point such as `tools/check_all.py` only if it reduces cross-platform quoting and duplicated task logic.
- [x] Separate required development dependencies from optional visual-capture dependencies.
- [x] Keep credentialed Kroger operations outside `npm run check`.
- [x] Define formatter and linter scopes narrowly enough to avoid a repository-wide reformat.
- [x] Update `README.md` and `AGENTS.md` with truthful setup and command instructions.

### Command rollout order

1. `validate` wraps the validators that already exist.
2. `test` wraps the existing deterministic test suites.
3. `format:check` and `lint` start in check-only mode.
4. `check` composes the stable commands.
5. `dev` and `build` remain placeholders only if Pass 16.3 has not yet introduced the build; do not publish misleading commands.

### Acceptance criteria

- A clean checkout can install JavaScript and Python dependencies using documented commands.
- Lockfiles produce repeatable dependency resolution.
- Existing direct validator commands still work.
- `npm run validate` and `npm run test` reproduce the previously documented checks.
- `npm run check` is deterministic, offline-safe, and returns nonzero on failure.
- No browser-visible files or Cloudflare settings change.
- Formatting configuration does not create an unrelated mass diff.

### Implementation note

Pass 16.1 is implemented, but its composed gate is intentionally not green: the baseline Gravity Fleet validator contradicts the committed Level 2 and Level 3 orbit multipliers. The failure is recorded in `docs/architecture/repository-validation-baseline.md` and remains outside this two-phase architecture scope. Windows clean-install verification is also pending. Do not unblock Pass 16.2 by excluding or weakening the validator.

## Pass 16.2 - CI and contract foundation

### Goal

Turn the repository's existing engineering checks into a reliable pull-request gate, then expand coverage carefully.

### Work items

- [ ] Add `.github/workflows/ci.yml` triggered for pull requests and relevant pushes.
- [ ] Use least-necessary permissions and concurrency cancellation for superseded runs.
- [ ] Cache dependencies using lockfile keys without caching generated repository outputs.
- [ ] Run jobs in an order that surfaces cheap failures before browser or build work.
- [ ] Preserve `.github/workflows/update-kroger-observations.yml` as an independent workflow.
- [ ] Add initial schemas for:
  - `data/projects.json`;
  - `data/showcase-config.json`;
  - PHX Transit replay/scenario artifacts;
  - EV True Cost data;
  - Shrinkflation browser data;
  - Procurement and Quote-to-Cash generated artifacts.
- [ ] Add schema-version and provenance fields only through backward-compatible, project-specific migrations.
- [ ] Reuse schemas from Python and JavaScript where practical instead of creating conflicting implementations.
- [ ] Add contract checks for:
  - registry status versus route `noindex` behavior;
  - public routes versus actual build entries;
  - Showcase references versus public/featured projects;
  - generated artifact reproducibility where generators exist;
  - absence of credentials and local absolute paths in deployable inputs.
- [ ] Add `.github/pull_request_template.md` and `.github/dependabot.yml`.
- [ ] Recommend branch-protection settings in documentation; do not claim they are enabled until GitHub confirms them.

### Suggested CI job progression

| Job | Initial contents | Expansion rule |
| --- | --- | --- |
| Repository validation | registry, JSON parse, schemas, generated-data validators | Required immediately when stable |
| Python quality | compile, Ruff, Pytest/unittest | Add mypy only where annotations justify it |
| JavaScript/CSS quality | syntax, ESLint, Stylelint, Prettier check | Avoid failing on untouched legacy files without an explicit baseline strategy |
| Production build | added in Pass 16.3 | Required before cutover |
| Browser smoke | added in Pass 16.7 | Required only after runtime is stable in CI |

### Acceptance criteria

- CI runs without credentials or network-dependent live data.
- Every existing validator is represented or its exclusion is documented.
- CI fails on a deliberately invalid schema fixture and passes on the committed data.
- The Kroger scheduled workflow retains its existing safety behavior.
- Linters and formatters do not make unrelated legacy code unmergeable without a documented ratchet plan.
- The CI status can become a required branch check once it has proven stable.

## Pass 16.3 - Parallel production-build proof

### Goal

Generate a production-grade `dist/` artifact and validate it without changing the current Cloudflare Pages deployment directory.

### Work items

- [ ] Add the approved build tool and configuration.
- [ ] Declare every HTML entry point explicitly or generate the list from a reviewed route manifest.
- [ ] Preserve public URL shapes rather than exposing source-folder paths.
- [ ] Copy only approved static assets and browser-safe data.
- [ ] Ensure `_headers` and `_redirects` land at the `dist/` root.
- [ ] Preserve source maps only if their production exposure is intentionally approved.
- [ ] Add hashed assets where safe while ensuring HTML references remain correct.
- [ ] Add a clean-build rule that removes stale output before generation.
- [ ] Add output assertions that fail when:
  - a required route is missing;
  - an unapproved top-level source directory appears;
  - a browser fetch points outside the artifact;
  - a private/local path or secret pattern appears;
  - a required Cloudflare control file is missing.
- [ ] Serve `dist/` locally and run route/data smoke checks against it.
- [ ] Compare the generated artifact with the Pass 16.0 route and deployment inventories.
- [ ] Keep Cloudflare configured to publish the repository root throughout this pass.

### Required output exclusions

At minimum, verify that `dist/` does not contain source copies of:

- `tools/`;
- `tests/`;
- `docs/` unless a document is intentionally linked as a public asset;
- `sql/`;
- `.github/`;
- `data-src/`;
- verification evidence;
- raw source datasets not intended for browser use;
- local setup files, lock metadata not required by the browser, or repository instructions.

### Acceptance criteria

- `npm run build` creates `dist/` from a clean checkout.
- Repeating the build without source changes produces equivalent deployable contents, allowing documented nondeterministic metadata only when unavoidable.
- Every current public route loads from a local `dist/` server.
- Nested Postcard Atlas pages and media work from their final URLs.
- All browser data requests resolve inside `dist/`.
- Public behavior matches the Pass 16.0 baseline at representative desktop, mobile, keyboard, reduced-motion, and print states.
- The output allowlist and denylist checks pass.
- Production still uses the old root deployment, so rollback is unnecessary in this pass.

## Pass 16.4 - Cloudflare `dist/` cutover

### Goal

Make the validated generated artifact the sole production deployment boundary.

### Preconditions

- Pass 16.3 is complete with no unexplained parity failures.
- CI builds and tests `dist/` on pull requests.
- A Cloudflare preview of the branch has been reviewed.
- The exact prior Cloudflare build configuration is recorded for rollback.
- Custom-domain, canonical-host, and current release work are not in an unstable transition.

### Work items

- [ ] Change Cloudflare Pages to use the documented build command and `dist` output directory.
- [ ] Verify environment versions match the repository's supported version policy.
- [ ] Verify preview and production builds start from clean checkouts.
- [ ] Test root, nested, redirected, hidden/noindex, and asset URLs on the preview.
- [ ] Inspect response headers and caching behavior for HTML, JSON, media, and hashed assets.
- [ ] Confirm the project registry, Showcase, and every public project load without console or network errors.
- [ ] Confirm print/PDF behavior from the deployed homepage.
- [ ] Perform the production switch only after preview approval.
- [ ] Run a post-deploy production smoke pass.
- [ ] Retain the rollback instructions until at least one stable follow-up release succeeds.

### Rollback plan

If the production smoke check reveals a material regression:

1. Restore the recorded prior Cloudflare build command and root output configuration.
2. Redeploy the last known-good `main` commit.
3. Confirm the root deployment is serving the prior behavior.
4. Reopen Pass 16.3 with the production-only failure captured as a regression test.
5. Do not patch production by manually editing `dist/`.

### Acceptance criteria

- Cloudflare reports a successful production build from the repository command.
- Production serves only the intended `dist/` artifact.
- All critical routes, redirects, browser data loads, headers, and media work on the real host.
- There are no new console errors, failed requests, indexing mistakes, or privacy exposures.
- The rollback procedure is complete and tested at least through a dry run of the configuration steps.
- `README.md` and `AGENTS.md` describe the new deployment truth.

## Pass 16.5 - Source and data-boundary migration

### Goal

Move source into consistent locations only after the deployment output is stable, using compatibility-preserving slices.

### Work items

- [ ] Create `src/`, `public/`, and `data-src/` according to approved ADRs.
- [ ] Move Cloudflare control files and public static assets through the build's supported public directory.
- [ ] Classify every current `data/` file before moving it.
- [ ] Move verification studies and non-browser source inputs out of the public tree.
- [ ] Update generators to write browser artifacts into the approved public-data location.
- [ ] Update validators and tests to use shared path helpers rather than scattered relative paths.
- [ ] Preserve root-relative browser URLs unless an explicit route migration is separately approved.
- [ ] Add generated-file metadata where useful:
  - `schemaVersion`;
  - `generatedAt` when deterministically controlled or intentionally variable;
  - `generator`;
  - `sourceHash`;
  - `fictional`, `synthetic`, or source classification.
- [ ] Mark generated artifacts clearly and document the correct edit path.
- [ ] Introduce a substantial-project README template covering purpose, data classification, architecture, entry point, source versus generated data, validation, limitations, and publication state.
- [ ] Migrate one representative project first; use it to refine the contract before moving the rest.

### Recommended migration slices

1. Shared site shell and public assets.
2. Project registry and Showcase configuration.
3. Procurement and Quote-to-Cash source/generated boundaries.
4. PHX Transit synthetic, verification, and browser-artifact boundaries.
5. Shrinkflation curated/browser data and credentialed tooling boundaries.
6. Gravity Fleet fixtures and sample telemetry.
7. Remaining project pages and Postcard Atlas.

### Acceptance criteria

- No browser-safe data disappears merely because source inputs moved.
- No verification or raw source file enters `dist/` unintentionally.
- Generators, validators, CI, and documentation agree on canonical paths.
- Direct manual edits to generated outputs are either prevented by checks or clearly detected through reproducibility validation.
- Each migrated slice passes production-build and browser smoke checks before the next slice begins.
- Public URL structure remains stable.

## Pass 16.6 - Focused application modularization

### Goal

Reduce high-coupling files by responsibility without changing product behavior. This is a series of focused pull requests, not one repository-wide rewrite.

### Root site slices

- [ ] Extract project-registry loading, validation, filtering, and sorting.
- [ ] Extract project-card rendering.
- [ ] Split Showcase configuration, controller, scenes, and development lab.
- [ ] Isolate navigation, print, and accessibility behaviors.
- [ ] Split global CSS into tokens, base, layout, components, feature areas, utilities, and intentional overrides.
- [ ] Adopt cascade layers only after proving existing specificity and print behavior.

### PHX Transit slices

- [ ] Separate replay timing/controller logic.
- [ ] Separate data normalization and metrics.
- [ ] Separate filter and selection state.
- [ ] Separate alerts, route snapshot, and selected-record views.
- [ ] Separate map adapter, vehicle animation, ripple effects, and fallback map.
- [ ] Preserve deterministic replay and canonical route-display behavior.
- [ ] Add unit coverage for interpolation, geometry, filtering, selection, and metric helpers before or alongside extraction.

### Gravity Fleet slices

- [ ] Continue the established separation between deterministic engine, runtime, camera, performance, telemetry, levels, and browser UI.
- [ ] Extract remaining large browser-shell responsibilities from `games/gravity-fleet-lab.js`.
- [ ] Preserve saved-run compatibility, fixed-step behavior, mobile controls, world rotation, and telemetry meanings.
- [ ] Add deterministic tests around extracted pure functions.

### CSS migration rules

- Do not split files by arbitrary line count.
- Each new file must have a clear owner and import position.
- Avoid temporary duplicate selectors across old and new files.
- Preserve print and reduced-motion rules near the features they govern or in clearly documented layers.
- Run visual checks at breakpoint-sensitive widths after every CSS slice.

### Acceptance criteria

- Each PR has one clear subsystem boundary and remains reviewable.
- Extracted modules expose small, documented interfaces.
- No circular imports are introduced.
- Existing routes and behavior remain unchanged except for separately documented fixes.
- Tests cover pure logic before DOM-heavy code is moved where practical.
- Bundle/output size and page startup do not regress materially without explanation.
- The final large files are smaller because responsibilities moved, not because code was minified or obscured.

## Pass 16.7 - Browser quality gates

### Goal

Catch user-visible regressions in the generated site before merge.

### Work items

- [ ] Add Playwright with a small, deterministic browser matrix.
- [ ] Add smoke coverage for:
  - homepage and project index;
  - every public project route;
  - Showcase open, navigate, close, and focus return;
  - mobile navigation;
  - PHX Transit load, play/pause, filtering, and selection;
  - Gravity Fleet initialization and a deterministic basic command path;
  - Shrinkflation data load and fallback state;
  - EV calculator default and changed-input result;
  - Procurement and Quote-to-Cash primary interactions;
  - Postcard Atlas nested navigation;
  - redirects and 404 behavior where testable locally.
- [ ] Fail on uncaught page errors and unexpected failed network requests.
- [ ] Add `@axe-core/playwright` checks to primary routes.
- [ ] Maintain a short, reasoned accessibility exception file only when a fix cannot land immediately.
- [ ] Add internal-link and referenced-asset validation.
- [ ] Verify major keyboard paths and focus behavior.
- [ ] Add reduced-motion coverage for animated surfaces.
- [ ] Preserve manual physical-device QA for Gravity Fleet where browser automation is insufficient.
- [ ] Evaluate Lighthouse CI only after stable functional tests exist.
- [ ] If performance budgets are added, use route-specific budgets and ratchet from measured baselines.

### Recommended initial browser matrix

| Purpose | Viewport/browser | Frequency |
| --- | --- | --- |
| Fast PR smoke | Chromium desktop | Every PR |
| Mobile layout and touch-sized controls | Chromium at 390 x 844 | Every PR for shared/browser changes |
| Breakpoint regression | Chromium at 768 and 1024 CSS pixels | Relevant changes |
| Cross-browser confidence | Firefox and WebKit on critical routes | Scheduled or release gate until runtime is acceptable |
| Full responsive/manual matrix | 320, 375, 390, 430, 768, 1024 plus landscape and 200% zoom | Release QA |

### Acceptance criteria

- Tests run against the built `dist/` artifact, not an alternate development-only rendering path.
- Critical-route smoke tests are deterministic and do not depend on third-party availability.
- New browser-visible changes cannot merge with uncaught errors or broken local assets.
- Primary routes have automated accessibility checks and documented manual keyboard coverage.
- Flaky tests are fixed or quarantined with ownership and a time-bounded follow-up; they are not repeatedly retried until green.
- Performance checks, if adopted, reflect measured user impact rather than arbitrary perfect scores.

## Pass 16.8 - Documentation and governance closeout

### Goal

Make the modernized structure understandable and prevent status or architecture drift from returning.

### Work items

- [ ] Reduce `PORTFOLIO_ROADMAP.md` to a concise portfolio-level tracker after archiving completed historical detail.
- [ ] Move historical pass detail to `docs/archive/roadmaps/` while preserving links and Git history.
- [ ] Link project-specific roadmaps rather than duplicating their contents.
- [ ] Generate the README route/publication table from `data/projects.json`, or add a CI contradiction check if generation is not worthwhile.
- [ ] Remove stale documentation that describes PHX Transit or other published work as hidden.
- [ ] Document the final repository map, command surface, dependency policy, data classification, build, deployment, and rollback procedures.
- [ ] Add or update substantial-project READMEs using the approved template.
- [ ] Document GitHub repository-setting recommendations:
  - required CI check;
  - squash merge preference;
  - automatic deletion of merged branches;
  - branch updates before merge;
  - Dependabot for Actions and npm.
- [ ] Decide whether the Kroger automation should remain a direct controlled update or later move to a bot branch and pull request. Do not change it without a separate safety review.
- [ ] Update this roadmap with actual outcomes, deviations, and follow-ups.

### Acceptance criteria

- A new contributor can install, develop, validate, build, and understand deployment from the root README.
- `AGENTS.md` no longer contains obsolete build-light restrictions that contradict the approved build architecture, while still forbidding unjustified frameworks or backends.
- Publication state has one canonical source and contradictions fail CI or are generated away.
- Architecture decisions explain why the repository uses a static multi-page build and strict output boundary.
- Historical roadmap detail remains discoverable without dominating the active tracker.
- All completed Pass 16 items reflect verified reality rather than planned intent.

## 8. Pull-request plan

Prefer one focused branch and draft pull request per row. Split a row further if its diff becomes difficult to review.

| PR | Suggested branch | Primary scope |
| --- | --- | --- |
| A | `agent/repository-modernization-baseline` | Inventories, baseline report, ADRs only |
| B | `agent/repository-command-foundation` | Manifests, lockfiles, command wrappers, setup docs |
| C | `agent/repository-ci-contracts` | CI, schemas, PR template, Dependabot |
| D | `agent/repository-dist-build` | Build configuration, route manifest, `dist/` assertions; no Cloudflare cutover |
| E | `agent/repository-dist-cutover` | Cloudflare configuration and deployment documentation only |
| F1-Fn | `agent/repository-source-migration-*` | One source/data family per PR |
| G1-Gn | `agent/modularize-*` | One application responsibility boundary per PR |
| H | `agent/browser-quality-gates` | Playwright, axe, links, critical smoke suite |
| I | `agent/repository-docs-closeout` | Active roadmap reduction, archive, final docs |

Do not combine PR D and PR E. The generated artifact must be reviewable before it becomes production.

## 9. Validation strategy

### Existing checks to preserve from day one

```bash
python tools/validate_project_registry.py
node tools/validate_project_registry_runtime.js
python tools/validate_ev_true_cost.py
python tools/validate_phx_transit_map.py
node tools/validate_gravity_fleet.js
python tools/procurement/validate_case_data.py
python tools/qtc/validate_case_data.py
python -m unittest tests/test_analytics_modernization.py
python tools/fetch_kroger_products.py --test-merge-fixture
```

Implementation must verify the current command names against live `main`; this list is a baseline, not permission to invent missing commands.

### Merge gate after Pass 16.3

```bash
npm ci
npm run format:check
npm run lint
npm run validate
npm run test
npm run build
npm run test:dist
```

### Pass-specific manual gates

- **Command/CI changes:** clean-environment installation on Windows and CI Linux.
- **Build/path changes:** all routes, nested assets, redirects, JSON fetches, headers, and print.
- **Data moves:** generator reproducibility, schema validation, provenance, and public-data review.
- **JavaScript modularization:** feature interactions, console/network, keyboard, reduced motion, and bundle behavior.
- **CSS modularization:** desktop, mobile, breakpoint-sensitive widths, landscape where relevant, and 200% zoom.
- **Cloudflare cutover:** preview approval followed by production smoke and rollback readiness.

## 10. Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Root-relative paths break after build | Medium | High | Route/fetch inventory, explicit entries, local `dist/` server, preview gate |
| Nested Postcard Atlas media is omitted or rewritten incorrectly | Medium | High | Treat as an early build-tool compatibility proof and add nested-route smoke tests |
| Verification or source data leaks into production | Medium today | High | Output allowlist/denylist, data classification, artifact scanning |
| Formatting/lint adoption creates massive unrelated diffs | High | Medium | Check-only rollout, narrow scopes, ratchet policy, separate formatting PR if ever approved |
| CI becomes slow or flaky | Medium | Medium | Cheap-first jobs, deterministic fixtures, limited PR browser matrix, scheduled cross-browser depth |
| Build migration and source moves obscure regressions | High if combined | High | Separate Passes 16.3, 16.4, and 16.5 |
| Generated files drift from sources | Medium | Medium | Reproducibility checks, source hashes, documented edit paths |
| Registry, README, Showcase, and route metadata contradict each other | Existing | Medium | Registry remains canonical; generate or validate secondary representations |
| Dependency churn creates maintenance overhead | Medium | Medium | Minimal package set, lockfiles, Dependabot grouping, scheduled upgrades |
| Modularization changes behavior unintentionally | Medium | High | Extract pure logic first, characterization tests, one responsibility per PR |
| Cloudflare production cutover fails despite local success | Low to medium | High | Preview validation, recorded configuration, immediate root-deploy rollback |
| Architecture work delays visible portfolio improvements indefinitely | Medium | Medium | Time-box passes, require measurable outcomes, allow urgent product fixes on separate branches |

## 11. Decision gates

### Gate A - Approve the tooling foundation

Proceed from 16.0 to 16.1 when:

- Vite or its alternative has passed the route compatibility study;
- the Node/Python version and lock policies are documented;
- no planned dependency requires a server runtime; and
- the initial command surface is agreed.

### Gate B - Accept `dist/` parity

Proceed from 16.3 to 16.4 when:

- all required routes and data exist in `dist/`;
- forbidden source/tooling content is absent;
- representative behavior matches the baseline;
- CI builds the artifact reliably; and
- the Cloudflare preview is approved.

### Gate C - Begin source relocation

Proceed from 16.4 to 16.5 when:

- at least one production release has succeeded from `dist/`;
- rollback instructions are still valid;
- path-related production defects are closed; and
- generators and validators have a shared path strategy.

### Gate D - Require browser tests

Make browser checks merge-blocking when:

- the suite has been stable across several representative pull requests;
- it runs against `dist/`;
- third-party availability is stubbed or avoided; and
- ownership for failures and flakes is documented.

## 12. Success measures

The program is complete when all of the following are true:

- A clean checkout can be installed and checked from documented commands.
- Pull requests receive deterministic repository, Python, JavaScript/CSS, build, and critical browser feedback.
- Cloudflare publishes only `dist/`.
- `dist/` contains no unintended tooling, tests, raw source data, verification evidence, local paths, or credentials.
- Public routes and browser behavior remain stable.
- Project lifecycle and ordering still have one canonical source.
- Generated data has explicit contracts and provenance appropriate to its project.
- Large application files have clear responsibility boundaries and meaningful tests.
- Active documentation describes current reality and historical detail is archived rather than lost.
- The repository remains recognizably a polished static portfolio, with more reliable engineering and no unnecessary platform complexity.

## 13. Immediate starting packet

The roadmap originally recommended Pass 16.0 only. At the user's direction, the first implementation combined Pass 16.0 and Pass 16.1 while preserving the boundary against CI, schemas, production build configuration, and Cloudflare changes.

### First-pass deliverable

Create the following without changing runtime behavior:

```text
docs/architecture/current-route-and-deployment-inventory.md
docs/architecture/repository-validation-baseline.md
docs/decisions/0001-static-multi-page-architecture.md
docs/decisions/0002-project-registry-source-of-truth.md
docs/decisions/0003-synthetic-and-generated-data-policy.md
docs/decisions/0004-build-and-dist-boundary.md
```

### First-pass completion checklist

- [x] Inspect latest `main`, not an older repository pack or QA branch.
- [x] Inventory current routes, redirects, fetch paths, assets, and data classifications.
- [x] Run and record all existing deterministic checks.
- [x] Test Vite's fit through a disposable proof or documented configuration study; do not commit the build yet.
- [x] Record unresolved path or data-classification questions.
- [x] Make no runtime or Cloudflare configuration changes; Pass 16.1 adds development-only dependency manifests as explicitly requested.
- [ ] Open a focused draft pull request for review.

Starting with this packet gives Pass 16.1 exact inputs and prevents the build migration from becoming an improvised file move.

## 14. Explicitly deferred decisions

These decisions should not be made prematurely:

- Whether TypeScript is useful for a specific future module.
- Whether mypy is worth enforcing outside reusable typed Python modules.
- Whether Lighthouse scores should block merges.
- Whether the Kroger workflow should open pull requests instead of committing through its current guarded flow.
- Whether project pages should eventually use shared HTML generation or templating.
- Whether any project needs its own repository.
- Whether a future contact endpoint or data product justifies a server component.

Each requires evidence from the modernized foundation or a concrete product need. None is required to complete the repository's current structural leap.
