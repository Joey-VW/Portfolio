# ADR 0003: Classify Synthetic, Generated, and Source Data Explicitly

- Status: Accepted
- Date: July 31, 2026

## Context

The current `data/` tree mixes browser-safe artifacts, source CSVs, authored synthetic scenarios, test samples, and verification evidence. Root deployment makes that boundary difficult to audit. Moving a file is not proof that it is safe to publish.

## Decision

Classify data by purpose before relocation:

- Browser-safe artifacts may enter the future production output.
- Source inputs remain reviewable but are excluded by default.
- Synthetic inputs and outputs retain clear fictional or synthetic labeling and traceability.
- Test fixtures and verification evidence do not enter production.
- Generated outputs document the correct generator and edit path where practical.
- Credentials, local paths, staging files, and private inputs never enter browser bundles or public JSON.

Pass 16.5 may introduce `public/data/` and `data-src/` only after the `dist/` deployment boundary is stable.

## Consequences

- Pass 16.3 needs an allowlist for production data.
- Generators and validators must converge on shared paths before source moves.
- PHX Transit synthetic replay remains publishable; cadence captures and static verification evidence do not.
- Procurement generated JSON remains publishable while its source CSV is source-only.
- Shrinkflation browser data remains separate from credentialed Kroger operations and staging data.

## Alternatives Considered

- **Copy all `data/` files to production:** rejected because browser artifacts, source inputs, staging files, and verification evidence have different privacy and reproducibility rules.
- **Move the full data tree before the build proof:** rejected because relocation would blur product regressions with deployment-boundary work.
- **Treat synthetic data as private:** rejected for explicitly fictional portfolio demos whose value depends on transparent, browser-readable fixtures.

## Follow-Up

- Pass 16.2 should add initial schemas without forcing disruptive data moves.
- Pass 16.5 should classify and relocate source and public data only after `dist/` behavior is proven.
