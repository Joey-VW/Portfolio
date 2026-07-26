# PHX Transit Pulse documentation

Documentation for **PHX Transit Pulse**, an independent GTFS-Realtime
operations-dashboard portfolio project.

> Independent portfolio prototype using publicly available transit-data
> sources. Not affiliated with or endorsed by Valley Metro or the City of
> Phoenix.

## Start here

- [`roadmap.md`](roadmap.md) — implementation stages, current status, blockers,
  and future work.
- [`architecture-study.md`](architecture-study.md) — verified architecture,
  approved boundaries, security constraints, and deferred technical decisions.
- [`data-contract.md`](data-contract.md) — draft normalized frontend data
  contract and application-state vocabulary.
- [`metric-dictionary.md`](metric-dictionary.md) — supported, provisional,
  deferred, and unsupported operational metrics.

## Design references

See [`design/`](design/) for the dashboard's visual north star and
design-specific notes.

The design concept guides the dashboard's structure, density, hierarchy, and
presentation. It is a visual direction rather than a source of operational
facts or metric definitions.

## Implementation plans

See [`plans/`](plans/) for focused implementation plans that have not yet been
incorporated fully into the canonical architecture or roadmap.

Current planning material includes:

- [`Interactive map implementation plan`](plans/interactive-map-implementation-plan.md)

Once a plan's decisions are accepted, durable conclusions should be transferred
into the architecture, contract, or roadmap rather than leaving the plan as the
only source of truth.

## Validation and research evidence

See [`validation/`](validation/) for Pass 13.0 feed-verification findings and
concise validator summaries.

Supporting machine-readable evidence remains under:

- [`../../data/phx-transit/verification/`](../../data/phx-transit/verification/)
- [`../../data/phx-transit/synthetic/`](../../data/phx-transit/synthetic/)

Verification tools remain under:

- [`../../tools/phx-transit/`](../../tools/phx-transit/)

## Current project boundary

The current dashboard uses clearly labeled, deterministic synthetic fixtures.

Public live ingestion and captured provider replay remain blocked until the
applicable provider terms permit the intended credential handling, polling,
caching, normalization, retention, attribution, and redistribution.

Synthetic fixtures may demonstrate supported states and formulas, but they do
not establish provider performance or upgrade a metric's evidence
classification.