from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from google.transit import gtfs_realtime_pb2

path = Path(
    "data/phx-transit/googletransit/trip-updates.pb"
)

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
route_ids = set()
trip_ids = set()
stop_ids = set()
schedule_relationships = Counter()

for entity in feed.entity:
    if not entity.HasField("trip_update"):
        continue

    update = entity.trip_update
    trip = update.trip

    counts["trip_updates"] += 1

    if trip.trip_id:
        counts["trip_id"] += 1
        trip_ids.add(trip.trip_id)

    if trip.route_id:
        counts["route_id"] += 1
        route_ids.add(trip.route_id)

    if trip.start_date:
        counts["start_date"] += 1

    if trip.start_time:
        counts["start_time"] += 1

    if trip.HasField("schedule_relationship"):
        counts["trip_schedule_relationship"] += 1
        schedule_relationships[
            f"trip:{trip.schedule_relationship}"
        ] += 1

    if update.vehicle.id:
        counts["vehicle_id"] += 1

    if update.timestamp:
        counts["trip_update_timestamp"] += 1

    if update.delay:
        counts["trip_level_delay_nonzero"] += 1

    for stop_update in update.stop_time_update:
        counts["stop_time_updates"] += 1

        if stop_update.stop_id:
            counts["stop_id"] += 1
            stop_ids.add(stop_update.stop_id)

        if stop_update.stop_sequence:
            counts["stop_sequence"] += 1

        if stop_update.arrival.time:
            counts["arrival_time"] += 1

        if stop_update.arrival.delay:
            counts["arrival_delay_nonzero"] += 1

        if stop_update.departure.time:
            counts["departure_time"] += 1

        if stop_update.departure.delay:
            counts["departure_delay_nonzero"] += 1

        if stop_update.HasField("schedule_relationship"):
            counts["stop_schedule_relationship"] += 1
            schedule_relationships[
                f"stop:{stop_update.schedule_relationship}"
            ] += 1

print("\nField coverage:")
for name, count in sorted(counts.items()):
    print(f"{name}: {count}")

print("\nUnique route IDs:", len(route_ids))
print("Unique trip IDs:", len(trip_ids))
print("Unique stop IDs:", len(stop_ids))

print("\nSchedule relationships:")
for name, count in sorted(schedule_relationships.items()):
    print(f"{name}: {count}")

print("\nSample entities:")
for entity in feed.entity[:3]:
    print(entity)
