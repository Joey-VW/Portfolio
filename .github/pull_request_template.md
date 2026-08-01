## Summary

-

## Validation

- [ ] `npm ci`
- [ ] `uv sync --dev --locked`
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run validate`
- [ ] `npm run test`
- [ ] `npm run check`
- [ ] Route or visual QA completed where applicable

## Scope Checks

- [ ] No production build, `dist/`, Cloudflare cutover, or source relocation included unless this PR explicitly owns that pass
- [ ] No credentialed Kroger, transit, BigQuery, deployment, or other live external write performed without authorization
- [ ] Public data, screenshots, logs, and generated artifacts reviewed for secrets, private details, and local paths

## Notes

-
