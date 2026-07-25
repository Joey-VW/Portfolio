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
    (base / "vehicle-positions.pb").read_bytes()
)

observed_routes = set()
observed_trips = set()
observed_stops = set()

for entity in feed.entity:
    if not entity.HasField("vehicle"):
        continue

    vehicle = entity.vehicle

    if vehicle.trip.route_id:
        observed_routes.add(vehicle.trip.route_id)

    if vehicle.trip.trip_id:
        observed_trips.add(vehicle.trip.trip_id)

    if vehicle.stop_id:
        observed_stops.add(vehicle.stop_id)

matched_routes = observed_routes & route_ids
matched_trips = observed_trips & trip_ids
matched_stops = observed_stops & stop_ids

print(
    "Routes:",
    len(matched_routes),
    "/",
    len(observed_routes),
)
print(
    "Trips:",
    len(matched_trips),
    "/",
    len(observed_trips),
)
print(
    "Stops:",
    len(matched_stops),
    "/",
    len(observed_stops),
)

print("\nUnmatched routes:", sorted(observed_routes - route_ids)[:20])
print("Unmatched trips:", sorted(observed_trips - trip_ids)[:20])
print("Unmatched stops:", sorted(observed_stops - stop_ids)[:20])
