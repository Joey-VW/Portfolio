from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from google.transit import gtfs_realtime_pb2

path = Path(
    "data/phx-transit/googletransit/vehicle-positions.pb"
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

field_counts = Counter()
route_ids = Counter()
trip_ids = Counter()

for entity in feed.entity:
    if not entity.HasField("vehicle"):
        continue

    vehicle = entity.vehicle

    if vehicle.trip.route_id:
        field_counts["route_id"] += 1
        route_ids[vehicle.trip.route_id] += 1

    if vehicle.trip.trip_id:
        field_counts["trip_id"] += 1
        trip_ids[vehicle.trip.trip_id] += 1

    if vehicle.vehicle.id:
        field_counts["vehicle_id"] += 1

    if vehicle.HasField("position"):
        field_counts["position"] += 1

        if vehicle.position.HasField("bearing"):
            field_counts["bearing"] += 1

        if vehicle.position.HasField("speed"):
            field_counts["speed"] += 1

    if vehicle.timestamp:
        field_counts["vehicle_timestamp"] += 1

    if vehicle.HasField("current_status"):
        field_counts["current_status"] += 1

    if vehicle.stop_id:
        field_counts["stop_id"] += 1

print("\nField coverage:")
for name, count in sorted(field_counts.items()):
    print(f"{name}: {count}")

print("\nUnique route IDs:", len(route_ids))
print("Unique trip IDs:", len(trip_ids))

print("\nSample entities:")
for entity in feed.entity[:3]:
    print(entity)
