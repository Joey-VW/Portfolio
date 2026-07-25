from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from google.transit import gtfs_realtime_pb2

path = Path(
    "data/phx-transit/googletransit/service-alerts.pb"
)

if not path.exists():
    raise FileNotFoundError(f"Feed file not found: {path.resolve()}")

feed = gtfs_realtime_pb2.FeedMessage()
feed.ParseFromString(path.read_bytes())

print("File:", path.resolve())
print("File size:", path.stat().st_size)
print("Feed version:", feed.header.gtfs_realtime_version)
print("Incrementality:", feed.header.incrementality)
print("Header timestamp:", feed.header.timestamp)

if feed.header.timestamp:
    print(
        "Header timestamp UTC:",
        datetime.fromtimestamp(
            feed.header.timestamp,
            tz=timezone.utc,
        ).isoformat(),
    )

print("Entity count:", len(feed.entity))

counts = Counter()
causes = Counter()
effects = Counter()
route_ids = set()
trip_ids = set()
stop_ids = set()
agency_ids = set()
languages = Counter()

for entity in feed.entity:
    if not entity.HasField("alert"):
        continue

    alert = entity.alert
    counts["alerts"] += 1

    if alert.active_period:
        counts["alerts_with_active_period"] += 1
        counts["active_periods"] += len(alert.active_period)

        for period in alert.active_period:
            if period.start:
                counts["active_period_start"] += 1
            if period.end:
                counts["active_period_end"] += 1

    if alert.HasField("cause"):
        counts["cause"] += 1
        causes[alert.cause] += 1

    if alert.HasField("effect"):
        counts["effect"] += 1
        effects[alert.effect] += 1

    if alert.url.translation:
        counts["url"] += 1
        for translation in alert.url.translation:
            if translation.language:
                languages[translation.language] += 1

    if alert.header_text.translation:
        counts["header_text"] += 1
        for translation in alert.header_text.translation:
            if translation.language:
                languages[translation.language] += 1

    if alert.description_text.translation:
        counts["description_text"] += 1
        for translation in alert.description_text.translation:
            if translation.language:
                languages[translation.language] += 1

    if alert.informed_entity:
        counts["alerts_with_informed_entity"] += 1
        counts["informed_entities"] += len(alert.informed_entity)

    for selector in alert.informed_entity:
        if selector.agency_id:
            counts["agency_id"] += 1
            agency_ids.add(selector.agency_id)

        if selector.route_id:
            counts["route_id"] += 1
            route_ids.add(selector.route_id)

        if selector.stop_id:
            counts["stop_id"] += 1
            stop_ids.add(selector.stop_id)

        if selector.trip.trip_id:
            counts["trip_id"] += 1
            trip_ids.add(selector.trip.trip_id)

        if selector.HasField("route_type"):
            counts["route_type"] += 1

print("\nField coverage:")
for name, count in sorted(counts.items()):
    print(f"{name}: {count}")

print("\nUnique agency IDs:", len(agency_ids))
print("Unique route IDs:", len(route_ids))
print("Unique trip IDs:", len(trip_ids))
print("Unique stop IDs:", len(stop_ids))

print("\nCauses:")
for value, count in sorted(causes.items()):
    print(f"{value}: {count}")

print("\nEffects:")
for value, count in sorted(effects.items()):
    print(f"{value}: {count}")

print("\nLanguages:")
for language, count in sorted(languages.items()):
    print(f"{language}: {count}")

print("\nSample entities:")
for entity in feed.entity[:3]:
    print(entity)
