# PHX Transit Pulse — GTFS-Realtime Validation Summary

**Validated:** July 24, 2026  
**Validator:** MobilityData GTFS-Realtime Validator, locally built from source  
**Environment:** Temurin Java 17.0.19 and Maven 3.9.16

## Static-feed compatibility note

The realtime validator's bundled static parser failed on the provider's current
`areas.txt` because it expected a required `wkt` field.

The original provider ZIP was not modified. A validator-only compatibility ZIP
omitted:

- `areas.txt`
- `stop_areas.txt`
- `directions.txt`

The original unmodified static ZIP separately passed MobilityData Canonical GTFS
Schedule Validator 8.0.1 with zero errors. The realtime validator's legacy static
parser result is therefore not treated as authoritative.

## Vehicle Positions

The saved snapshot parsed successfully.

| Rule | Severity | Count |
|---|---|---:|
| E028 — position outside agency coverage area | Error | 1 |
| E052 — duplicate `vehicle.id` | Error | 1 |
| W004 — unrealistic speed | Warning | 1 |
| W008 — header older than 65 seconds | Warning | 1 |
| W009 — missing `schedule_relationship` | Warning | 1 |

The stale-header warning is expected for a frozen snapshot. Consumers should
deduplicate vehicle IDs and defensively handle implausible coordinates and speeds.

## Trip Updates

The saved snapshot parsed successfully.

| Rule | Severity | Count |
|---|---|---:|
| E022 — sequential stop-update times not increasing | Error | 1 |
| E047 — VehiclePosition/TripUpdate pairing mismatch | Error | 1 |
| W003 — ID present in one feed but missing from another | Warning | 1 |
| W008 — header older than 65 seconds | Warning | 1 |

`E022` is the clearest content finding. Consumers must not assume stop predictions
are strictly monotonic.

`E047` and `W003` require cautious interpretation because the same rules appeared
during an alerts-only run.

## Service Alerts

The saved snapshot parsed successfully.

| Rule | Severity | Count |
|---|---|---:|
| E047 — VehiclePosition/TripUpdate pairing mismatch | Error | 1 |
| W003 — ID present in one feed but missing from another | Warning | 1 |
| W008 — header older than 65 seconds | Warning | 1 |

No alert-specific validation finding was reported. The cross-feed rules are not
meaningful evidence against an alerts-only payload.

## Implementation rules

- Deduplicate realtime entities by stable identifier.
- Preserve valid zero values.
- Flag or reject implausible coordinates and speeds.
- Validate and order stop predictions defensively.
- Preserve cancelled trips and skipped stops as explicit states.
- Treat stale-header findings from frozen snapshots as test artifacts.
- Treat the canonical JSON report as the authoritative static validation result.
