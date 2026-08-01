# Cloudflare Dist Cutover Runbook

This runbook records the completed Pass 16.4 production cutover and the retained rollback procedure.

## Current Production Configuration

- Cloudflare Pages project: connected to `Joey-VW/Portfolio`
- Production branch: `main`
- Pull-request previews: enabled
- Framework preset: **None**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

Cloudflare cut production over to this configuration on August 1, 2026. Deployment `b5426265-77d5-44b8-bb64-4a90933adafe` built commit `f2bd10caf56db4449161c42ec92e8a57b564e30a` with Node 24.13.1 and published the generated artifact successfully.

## Verified Production Configuration

- Framework preset: **None**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: match the repository policy, currently Node 24

The Cloudflare build must start from a clean checkout and must not require live Kroger, transit, BigQuery, or other credentialed data access.

The pre-cutover gate produced 119 files and artifact SHA-256 `a0cd342b4d049b4f5da02b643e1c5326e571516744178e52382148a0144ea6e2`. The first Cloudflare attempt exposed Python package auto-discovery that local artifact checks did not exercise. PR #42 added explicit no-package setuptools configuration; the root-mode recovery deployment and the subsequent `dist` deployment both succeeded from clean checkouts.

## Preview Verification

Before changing production, create and review a preview whose upload input is explicitly the generated `dist/` directory. The normal Git-integrated pull-request preview remains useful supplementary evidence, but it does not prove that Cloudflare uploaded `dist/` while the project still publishes the repository root.

From the approved branch, run the complete local gate and record the resulting `Dist validation passed` summary, including its SHA-256 value, with the deployed Git commit SHA:

```powershell
npm run check
git rev-parse HEAD
npx wrangler pages deploy dist --project-name portfolio --branch pass-16-dist-proof
```

Record the Wrangler preview URL with those two values in the pull request. This deployment uploads only the generated artifact to an isolated preview branch; it does not change the Git-integrated deployment, Cloudflare dashboard settings, or production output directory.

On that explicit `dist` preview, verify:

- Root, `/projects/`, every public project route, hidden/noindex project routes, game routes, and redirected routes.
- Nested Postcard Atlas demo pages, CSV data, background image, and video manifest media.
- Gravity Fleet module loads and basic interaction.
- PHX Transit map, synthetic data, accessible records, and schematic fallback behavior.
- Showcase project rendering from committed JSON.
- `_headers` through actual HTTP response headers, plus `_redirects`, HTML, JSON, media, and hashed asset response behavior.
- Console and network health at desktop and mobile widths.
- Keyboard navigation, reduced-motion behavior, and homepage print/PDF behavior.
- Preview indexing behavior. Document whether `noindex` comes from Cloudflare preview behavior or an explicit repository response header; do not attribute it to `_headers` without checking the response.

Only mark Pass 16.3 complete and move its pull request out of draft after every required parity check passes, or every accepted difference is documented with rationale and approval.

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

The verified rollback values are framework preset **None**, root directory repository root, build command `exit 0`, and output directory `/`. These values were restored and proven by successful deployment `c228e77c-27ae-4a02-99b1-480714cb8bb6` before the corrected production cutover.

## Production Evidence

The August 1, 2026 production pass verified the homepage, project index, PHX Transit, Gravity Fleet, the hidden Postcard Atlas demo, public JSON and media, legacy redirects, security headers, JSON caching, and route-specific `noindex`. Browser checks reported no console errors. Repository-only paths such as `package.json`, `pyproject.toml`, `tools/check_all.py`, and `PORTFOLIO_ROADMAP.md` no longer return their source contents from production.
