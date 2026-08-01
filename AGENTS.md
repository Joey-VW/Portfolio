# Portfolio Agent Guide

## Scope and precedence

This file applies to the entire repository (Joey-VW/Portfolio). A more specific `AGENTS.md` in a subdirectory may add or override rules for that subtree.

Treat `PORTFOLIO_ROADMAP.md` as the source of truth for priorities, dependencies, acceptance criteria, and completion status. Read the full relevant roadmap pass before editing. Check an item only after every applicable acceptance criterion has been implemented and verified.

## Usage-conservation policy

Conserve ChatGPT Plus weekly usage while delivering correct, complete work. Efficiency is a planning constraint, not permission to weaken correctness, privacy, security, accessibility, required acceptance criteria, or honest verification.

Use one lead agent by default. The lead should inspect the repository, implement the change, validate it, and report the result as one coherent pass whenever practical. Prefer direct repository inspection over delegating research that the lead can perform quickly.

Do not use subagents merely because parallelism is available. Default to one lead agent and zero subagents. Use at most one read-only subagent per task unless the user explicitly authorizes more or the lead documents why additional independent work provides clear material value. Delegate only when a tightly scoped, independent assignment outweighs the extra agent turns, duplicated context, and integration work. Examples include a genuinely separable specialist review, an independent investigation of a difficult failure, or a large read-only inventory that would otherwise block implementation. Do not spawn a subagent for work the lead can complete through a targeted repository search and focused file reads. When delegation is useful:

- Prefer one read-only subagent over several agents.
- Give it a narrow question, explicit file or subsystem boundaries, and a concrete expected output.
- Reuse its findings; do not repeat the same analysis unless evidence conflicts or the result is incomplete.
- Avoid overlapping assignments, duplicate reviews, and multiple agents reading the same files for the same purpose.
- Keep all writes with the lead unless non-overlapping parallel implementation is explicitly authorized and materially beneficial.

Work usage-efficiently throughout the task:

- Read the relevant roadmap section and source-of-truth files once, then keep a compact working checklist instead of repeatedly rediscovering scope.
- Search first with `rg` or an equivalent targeted tool. Read focused ranges when enough; read a whole file when coupling or context makes that safer.
- Batch related searches, file inspections, status checks, and independent read-only tool calls when practical.
- Inspect the current diff before reopening unchanged files. Avoid duplicate analysis and repeated broad repository scans.
- Make the smallest coherent implementation pass that satisfies the complete scoped request. Prefer finishing that pass with the lead over splitting it across agents.
- Combine closely related fixes that share context and validation, but do not broaden scope merely to reduce turns.
- Ask a clarifying question only when the missing answer would materially change the implementation, risk, or authorization. Otherwise state a safe assumption and proceed.
- Use existing repository tools and dependencies. Do not add setup work solely for optional evidence.
- Run validation proportional to the files and behaviors changed. Start narrow and escalate only when failures, shared dependencies, public-data risk, or task scope justify broader checks.
- Keep plans, prompts, progress updates, pull-request text, and final reports concise. Report outcomes, validation, limitations, and decisions without narrating routine tool use.

Usage savings never override a required stop, approval, privacy review, acceptance criterion, or applicable validation gate. If the efficient path and the safe path conflict, choose the safe path and explain the constraint briefly.

## Repository intent

This is Joe Wisto's public portfolio and resume site. The north star is a clear, polished experience that helps recruiters and potential clients understand the work quickly, explore it confidently, and distinguish finished projects from work in progress.

Assume every committed file and its Git history may become public.

Preserve the current static multi-page product architecture while following the approved Pass 16 tooling foundation:

- Plain HTML, CSS, and vanilla JavaScript
- Static JSON loaded in the browser
- Python utilities for local validation, capture, and data preparation
- npm as the cross-platform command surface for repository checks
- Locked Node and Python development environments
- Cloudflare-compatible `_headers` and `_redirects`

The root npm and uv manifests are repository tooling, not a browser framework or backend. Do not introduce a framework, application server, database, or new runtime dependency for a scoped feature without explicit approval. Vite is approved in principle for the later, separately scoped `dist/` proof; do not add its production configuration or change Cloudflare output settings during unrelated work.

## Source-of-truth map

Use the narrowest appropriate file family:

- `PORTFOLIO_ROADMAP.md` - implementation order, dependencies, and acceptance criteria
- `README.md` - setup, route map, and public repository documentation
- `index.html` - homepage and resume content
- `styles.css` - shared visual system, homepage styles, shared cards, and print rules
- `script.js` - shared browser behavior, project rendering, and Showcase Launcher behavior
- `data/projects.json` - canonical project metadata used by the homepage, project index, and Showcase
- `projects/index.html` - project-index shell
- `projects/<project>.html|css|js` - project-specific markup, styling, and behavior
- `games/<game>.html|css|js` - game-specific markup, styling, simulation, and telemetry
- `data/*.json` - public, browser-readable datasets and sample data
- `tools/` - local or backend-only validation, capture, and data-preparation utilities
- `_headers` and `_redirects` - Cloudflare-compatible deployment behavior
- `package.json` and `package-lock.json` - supported root commands and locked JavaScript tooling
- `pyproject.toml` and `uv.lock` - Python environment policy and locked dependencies
- `tools/check_all.py` - cross-platform orchestration for deterministic checks
- `docs/architecture/` and `docs/decisions/` - current baselines and approved architecture decisions

Keep feature-specific code in its matching project or game files. Change shared root files only when behavior is intentionally shared or the task targets the homepage, project registry, or Showcase Launcher.

When project metadata changes, update `data/projects.json` and keep the matching route consistent. Edit the project page when its route or public content changes; metadata-only status, visibility, and ordering changes do not require a token page edit. Do not duplicate project ordering, status, visibility, or metadata logic in page markup. If the roadmap specifies a schema that has not shipped yet, implement that schema rather than inventing a competing system.

## Working model for Codex and agents

The lead agent owns scope, decisions, implementation, integration, validation, and the pull request. It is the sole writer by default. Parallel writing is appropriate only when explicitly authorized, materially valuable, and partitioned across non-overlapping file families, where a file family is a set of tightly coupled files that normally change together.

Do not let agents edit the same or overlapping file family. Agents sharing a working directory must not switch branches or write in parallel. Use isolated worktrees or checkouts for authorized concurrent implementation branches; otherwise sequence all writes through the lead.

Start from the latest `main` unless the task explicitly depends on an unmerged branch. Prefer one focused branch and pull request per roadmap pass or independently reviewable slice.

When a task continues work from an unmerged pull request, the user must select that pull request's branch before starting the Codex task. The agent should verify the current checkout and commit before editing and must not assume it started from `main`.

When direct push or PR-update capability is unavailable, the agent should complete one focused commit on the selected checkout and report:

- the commit hash
- the current branch and base commit
- the intended parent pull request
- the exact files changed
- whether the result should be applied through the Codex `Create PR` option

Do not claim that an existing pull request was updated unless the remote branch actually changed. Do not instruct the user to export patches unless creating a new Codex pull request is unavailable or explicitly declined.

## Scope and change discipline

Before editing:

1. Read the complete relevant roadmap section and acceptance criteria.
2. Inspect the relevant HTML, CSS, JavaScript, data, configuration, and documentation.
3. Identify the source of truth and likely shared-file impact.
4. Check repository status and preserve unrelated user changes.
5. Resolve any ambiguity that would materially change the outcome.

Perform these steps as one batched orientation pass where practical. Do not reread unchanged context unless implementation findings make it necessary.

During implementation:

- Make the smallest coherent change that fully satisfies the task.
- Do not refactor, rename, reformat, or clean unrelated code.
- Prefer extending existing configuration and patterns over adding parallel systems.
- Keep data transformation and rendering logic separate where practical.
- Preserve useful loading, empty, fallback, error, pre-action, and post-action states.
- Do not hide a failure behind placeholder success behavior.
- Do not delete files merely because they appear unused. Verify references and their development or roadmap purpose first.
- Preserve root-relative public paths such as `/data/...`, `/assets/...`, `/projects/...`, and `/games/...` unless deployment strategy is intentionally changing.
- Do not merge, deploy, publish, promote data, or perform live external writes without user authorization.

Avoid the Unicode em dash (`U+2014`) in front-end and back-end copy unless a specific requirement makes it necessary. Prefer ` - ` for parenthetical separation. Preserve the en dash (`U+2013`) where it is meaningful, such as date ranges.

## Public data, privacy, and secrets

- Never commit credentials, API tokens, private keys, cookies, sessions, or unapproved personal or client information.
- Keep real credentials in local `.env` files only. Commit placeholders only in `.env.example`.
- Never expose Kroger or other private API credentials to browser JavaScript or public JSON.
- Keep the Shrinkflation frontend limited to committed, source-aware JSON. Use the Python workflow for credentialed fetching and staged review.
- Keep sensitive EV ownership, financing, receipt, location, and acquisition details out of public browser data unless explicitly approved.
- Anonymize private client work unless the user explicitly approves attribution.
- Review screenshots, copied repositories, fixtures, logs, comments, metadata, and error messages for names, addresses, emails, tokens, IDs, private preview or admin URLs, sensitive URL parameters, and local paths before committing.
- Do not commit ignored Kroger staging data, `.env` files, generated captures, nested `.git` directories, or repository credentials.
- Do not treat an unlisted static route as private or secure.
- Do not add external assets or third-party scripts without reviewing privacy, reliability, licensing, performance, and redistribution terms.

If privacy is uncertain, stop and ask before publishing the information.

## Front-end and interaction quality

Preserve the site's established visual language. Favor clear hierarchy, strong spacing, readable typography, concise copy, meaningful visuals, and fewer better elements.

For relevant changes:

- Use semantic HTML and a meaningful heading order.
- Preserve skip links, logical keyboard order, visible focus states, and accessible names.
- Make Enter and Space activation, Escape behavior, dialog focus containment, and focus return work where applicable.
- Mark decorative visuals appropriately and provide useful text alternatives for meaningful visuals.
- Preserve or add `prefers-reduced-motion` behavior for nonessential movement and smooth scrolling.
- Keep a static, understandable state when motion is reduced.
- Prevent horizontal overflow, clipped content, and sticky or anchor collisions.
- Keep primary touch targets comfortable, approximately 44 CSS pixels where practical.
- Preserve readable fallbacks for canvases, charts, and asynchronously loaded data.
- Keep animation and game behavior frame-rate-aware where elapsed-time logic already exists.
- Avoid inline feature styling when a matching stylesheet exists.
- Recheck the homepage print/PDF experience after material homepage or shared print-style changes.

For a normal visual pass, inspect the affected route at desktop, mobile, and a breakpoint-sensitive tablet width. The final mobile gate defined in the roadmap uses 320, 375, 390, 430, 768, and 1024 CSS pixels plus relevant landscape layouts and 200 percent browser zoom.

## Local preview and validation

Serve the repository root through HTTP. Do not validate fetch-dependent pages through `file://`.

```bash
python -m http.server 8000
```

Then use `http://localhost:8000`.

Install the default locked tool environments with `npm ci` and `uv sync --dev --locked`. Use the supported root commands when their scope applies:

```bash
npm run format:check
npm run lint
npm run validate
npm run test
npm run check
```

The direct commands below remain supported for focused debugging. Do not invent additional npm, formatter, linter, or test commands that the repository does not provide.

Use progressive validation:

1. Always inspect the final scope and run the baseline diff checks.
2. Run the file-type and feature-specific checks triggered by the changed files below.
3. Exercise only affected routes, states, viewports, and interaction modes.
4. Broaden validation when a shared root file, schema, registry, navigation path, public dataset, or cross-project behavior changes; when a narrow check fails; or when the risk is otherwise material.

Do not run the full validation catalog by habit. Conversely, do not skip a triggered check merely to save usage.

Baseline checks and inspection:

```bash
git diff --check
git status --short
```

Treat `git diff --check` as the validation gate. Inspect `git status --short` for scope, but do not treat unrelated pre-existing changes as failures or modify them.

For changed JSON:

```bash
python -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8')); print('JSON valid')" path/to/file.json
```

For changed Python:

```bash
python -m py_compile path/to/file.py
```

For changed JavaScript, when Node is available:

```bash
node --check path/to/file.js
```

If EV data or calculations change, run the Python validator and, when Node is available, the JavaScript syntax check:

```bash
python tools/validate_ev_true_cost.py
node --check projects/ev-true-cost.js
```

If Kroger merge, matching, observation, or Shrinkflation data logic changes:

```bash
python tools/fetch_kroger_products.py --test-merge-fixture
```

Use the offline fixture test by default. A Kroger `--dry-run` prevents file writes but may still make credentialed live API requests; use it only when live fetching is explicitly in scope and authorized. Do not write staging data, apply observations, promote history, or overwrite curated data unless the task explicitly requires it and the output will be reviewed.

If `data/projects.json` or shared project rendering changes, verify the homepage, `/projects/`, and Showcase display the same intended visible set and ordering.

Also run the registry validator when project lifecycle metadata or routes change. When Node is available, run the runtime helper regression check too:

```bash
python tools/validate_project_registry.py
node tools/validate_project_registry_runtime.js
```

For browser-visible changes:

- Load every affected route from the local server.
- Check the browser console and failed network requests.
- Exercise affected interactions with mouse, keyboard, and touch-sized viewports.
- Inspect applicable loading, empty, error, fallback, pre-action, live, and post-action states.
- Verify reduced-motion behavior when motion or scrolling changes.
- Check Chrome print preview at US Letter size when homepage resume content or shared print CSS changes.

Use `tools/capture_page.py` for repeatable visual comparisons only when Playwright, Pillow, and a launchable Chromium installation are already confirmed available. Do not invoke capture speculatively to discover missing dependencies. When availability is unknown, make at most one lightweight prerequisite check; if it fails, do not install, retry, or repeat capture errors, and continue with proportional source-level validation. When the user will perform Cloudflare visual QA, skip local capture unless it is specifically requested or browser availability is already confirmed. Record external rendered QA as pending once in the final report. Agents must use non-interactive capture. Do not add unrelated dependencies solely to produce a screenshot, and never commit generated captures.

Example captures:

```bash
python tools/capture_page.py http://127.0.0.1:8000/ --no-interactive --mode both --width 1440 --height 1000 --wait-for-text-gone "Loading project cards..." --slug home-desktop
python tools/capture_page.py http://127.0.0.1:8000/ --no-interactive --mode both --width 390 --height 844 --wait-for-text-gone "Loading project cards..." --slug home-mobile
```

Creating captures is not validation by itself. Inspect them and report any unavailable checks honestly. Lighthouse, axe, and deployment checks are optional unless already available or explicitly in scope.

## Pull requests and merges

For Cloudflare Pages workflows, distinguish pre-PR local validation from post-PR deployment QA. A preview may not exist until after the branch and pull request are created, so record Cloudflare visual QA as pending rather than permanently unavailable.

Before opening a pull request, review the complete diff against `main` and remove accidental or unrelated changes.

A pull request should include:

- Roadmap pass or items addressed
- User-visible behavior changed
- Files or systems affected
- Validation performed and results
- Relevant desktop and mobile captures for visual changes
- Accessibility, keyboard, reduced-motion, and print checks where applicable
- Known risks, limitations, blockers, and follow-ups

Use a draft PR while visual approval, external configuration, or another dependency remains. Do not merge while required checks are failing, review findings remain actionable, acceptance criteria are incomplete, or the user has not authorized merging.

## Definition of done

A task is complete only when all applicable conditions are met:

- Every stated acceptance criterion is satisfied.
- Relevant automated and syntax checks pass.
- Affected routes load without new console or network errors.
- Important desktop, mobile, and dynamic states have been inspected.
- Keyboard navigation, focus behavior, reduced motion, and accessibility have been checked where relevant.
- Print behavior has been checked when relevant.
- Copy is accurate, consistent, and free of unnecessary em dashes.
- No unfinished project is exposed unintentionally.
- No secrets, generated captures, unrelated files, or private information were introduced.
- Documentation, schemas, and roadmap status reflect what actually shipped.
- A fresh diff review finds no unresolved correctness, accessibility, responsive-layout, or regression issues.

If an applicable condition cannot be verified, report it explicitly and leave the roadmap item incomplete.
