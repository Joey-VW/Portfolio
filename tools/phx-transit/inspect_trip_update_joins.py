import csv
from pathlib import Path

from google.transit import gtfs_realtime_pb2

base = Path("data/phx-transit/googletransit")


def load_ids(filename, column):
    with (base / filename).open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return {
            row[column]
            for row in csv.DictReader(file)
            if row.get(column)
        }


route_ids = load_ids("routes.txt", "route_id")
trip_ids = load_ids("trips.txt", "trip_id")
stop_ids = load_ids("stops.txt", "stop_id")

feed = gtfs_realtime_pb2.FeedMessage()
feed.ParseFromString(
    (base / "trip-updates.pb").read_bytes()
)

observed_routes = set()
observed_trips = set()
observed_stops = set()

for entity in feed.entity:
    if not entity.HasField("trip_update"):
        continue

    update = entity.trip_update

    if update.trip.route_id:
        observed_routes.add(update.trip.route_id)

    if update.trip.trip_id:
        observed_trips.add(update.trip.trip_id)

    for stop_update in update.stop_time_update:
        if stop_update.stop_id:
            observed_stops.add(stop_update.stop_id)

print("Routes:", len(observed_routes & route_ids), "/", len(observed_routes))
print("Trips:", len(observed_trips & trip_ids), "/", len(observed_trips))
print("Stops:", len(observed_stops & stop_ids), "/", len(observed_stops))

print("\nUnmatched routes:", sorted(observed_routes - route_ids)[:20])
print("Unmatched trips:", sorted(observed_trips - trip_ids)[:20])
print("Unmatched stops:", sorted(observed_stops - stop_ids)[:20])
