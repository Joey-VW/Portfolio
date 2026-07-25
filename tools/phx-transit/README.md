# PHX Transit verification tools

Run these one-purpose scripts from the repository root. They require Python 3
and the `gtfs-realtime-bindings` package (the import is
`google.transit.gtfs_realtime_pb2`). Cadence scripts otherwise use only the
Python standard library. Do not add local dependencies or captures to the repo.

## Local inputs

Inspection scripts expect an untracked working directory at
`data/phx-transit/googletransit/` containing the extracted static GTFS text files
and, as applicable, local `vehicle-positions.pb`, `trip-updates.pb`, or
`service-alerts.pb` snapshots. This directory and raw protobuf files must never
be committed. The scripts print local inspection output; review it before sharing.

Cadence scripts fetch live feeds and require `VALLEY_METRO_API_KEY` in the local
environment. Never put the value in a command, source file, URL in documentation,
shell history, log, fixture, or commit. Run live requests only when provider
authorization and the intended cadence permit them.

## Script inventory

| Script | Purpose |
| --- | --- |
| `inspect_vehicle_feed.py` | Summarize a local Vehicle Positions snapshot, timestamps, field coverage, IDs, and sample entities. |
| `inspect_vehicle_joins.py` | Compare Vehicle Positions route, trip, and stop IDs with local static GTFS. |
| `inspect_trip_updates.py` | Summarize a local Trip Updates snapshot, timestamps, relationships, prediction fields, and IDs. |
| `inspect_trip_update_joins.py` | Compare Trip Updates route, trip, and stop IDs with local static GTFS. |
| `inspect_service_alerts.py` | Summarize a local Service Alerts snapshot, active periods, text, URLs, effects, and selectors. |
| `inspect_service_alert_joins.py` | Compare alert route, trip, stop, and agency selectors with local static GTFS. |
| `measure_vehicle_cadence.py` | Make the configured Vehicle Positions cadence run and write a sanitized verification CSV. |
| `measure_realtime_cadence.py` | Measure Trip Updates and Service Alerts cadence and write a sanitized combined CSV. |

## Examples

Install the one external Python dependency in an existing local environment:

```bash
python -m pip install gtfs-realtime-bindings
```

Run local snapshot inspection and joins from the repository root:

```bash
python tools/phx-transit/inspect_vehicle_feed.py
python tools/phx-transit/inspect_vehicle_joins.py
python tools/phx-transit/inspect_trip_updates.py
python tools/phx-transit/inspect_trip_update_joins.py
python tools/phx-transit/inspect_service_alerts.py
python tools/phx-transit/inspect_service_alert_joins.py
```

Set the secret without placing its value in repository documentation, then run an
authorized cadence check:

```bash
export VALLEY_METRO_API_KEY='<REDACTED_LOCAL_SECRET>'
python tools/phx-transit/measure_vehicle_cadence.py
python tools/phx-transit/measure_realtime_cadence.py
```

Cadence CSV output belongs under `data/phx-transit/verification/` only after it
has been checked for safe publication. Credentials, raw `.pb` captures, the
extracted static feed, compatibility ZIPs, validator databases/runtime files,
validator source, Maven files, `_temp` dependencies, and build output must remain
uncommitted.
