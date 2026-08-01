# ADR 0004: Generate and Validate a Strict `dist/` Boundary

- Status: Accepted in principle; production cutover deferred
- Date: July 31, 2026

## Context

Cloudflare Pages currently publishes the repository root. That preserves simple static behavior but can expose tools, tests, source inputs, and verification evidence. A disposable Vite 8.2.0 study successfully represented all 19 HTML entries and the existing ES-module routes, while showing that classic scripts and approved static files need explicit handling.

## Decision

Use Vite as the planned lightweight multi-page build tool unless Pass 16.3 discovery finds a blocking parity defect. The build must:

- declare or generate every reviewed HTML entry;
- preserve current public URL shapes;
- copy only approved browser assets and data;
- preserve classic-script behavior without a broad module rewrite;
- include Postcard Atlas nested media and fallbacks;
- place `_headers` and `_redirects` at the output root;
- generate a disposable, ignored `dist/` directory; and
- fail assertions for missing required paths or forbidden source/tooling content.

Pass 16.3 proves `dist/` in parallel with the existing root deployment. Pass 16.4 is the only pass authorized to change Cloudflare's production output directory after preview approval and rollback preparation.

## Consequences

- Build configuration and deployment cutover remain separate pull requests.
- `dist/` is never edited manually or committed.
- Root-relative paths remain supported unless a later decision explicitly changes them.
- The build cannot require live APIs or credentials.
- Static copying must be allowlisted; copying the entire repository is not acceptable production behavior.

## Alternatives Considered

- **Continue deploying the repository root indefinitely:** rejected because it cannot enforce a strict production artifact boundary.
- **Custom Python copier only:** deferred as a fallback because Vite already handles the ES-module routes and HTML entry graph while still allowing explicit static-copy assertions.
- **Cloudflare cutover in the same pass as the proof:** rejected because preview parity and rollback preparation must happen before production output changes.

## Follow-Up

- Pass 16.3 must commit the build proof, output assertions, and local `dist/` validation while production still serves the root.
- Pass 16.4 may change Cloudflare output only after preview approval and documented rollback readiness.
