# Cloudflare Dist Cutover Runbook

This runbook records the Pass 16.4 dashboard change that must happen only after the Pass 16.3 generated artifact is verified locally, in CI, and on a Cloudflare pull-request preview.

## Current Production Configuration

- Cloudflare Pages project: connected to `Joey-VW/Portfolio`
- Production branch: `main`
- Pull-request previews: enabled
- Framework preset: **None**
- Build command: blank or `exit 0`
- Build output directory: `/`
- Root directory: repository root

These settings keep production on the historical repository-root deployment while Pass 16.3 proves the generated `dist/` artifact.

## Proposed Pass 16.4 Configuration

- Framework preset: **None**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: match the repository policy, currently Node 24

The Cloudflare build must start from a clean checkout and must not require live Kroger, transit, BigQuery, or other credentialed data access.

## Preview Verification

Before changing production, verify a Cloudflare pull-request preview for:

- Root, `/projects/`, every public project route, hidden/noindex project routes, game routes, and redirected routes.
- Nested Postcard Atlas demo pages, CSV data, background image, and video manifest media.
- Gravity Fleet module loads and basic interaction.
- PHX Transit map, synthetic data, accessible records, and schematic fallback behavior.
- Showcase project rendering from committed JSON.
- `_headers`, `_redirects`, HTML, JSON, media, and hashed asset response behavior.
- Console and network health at desktop and mobile widths.
- Keyboard navigation, reduced-motion behavior, and homepage print/PDF behavior.

## Production Cutover

After preview approval:

1. In Cloudflare Pages settings, set the build command to `npm run build`.
2. Set the build output directory to `dist`.
3. Keep the framework preset as **None** and the root directory as the repository root.
4. Trigger a production deployment from the approved `main` commit.
5. Run post-deploy route, redirect, header, JSON, media, indexing, console/network, mobile, keyboard, reduced-motion, and print smoke checks.

## Rollback

If production smoke reveals a material regression:

1. Restore the build command to blank or `exit 0`.
2. Restore the build output directory to `/`.
3. Redeploy the last known-good `main` commit.
4. Confirm the root deployment serves the prior behavior.
5. Capture the production-only failure as a Pass 16.3 regression test before retrying the cutover.

Never manually patch generated `dist/` contents.
