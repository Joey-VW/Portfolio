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
agency_ids = load_ids("agency.txt", "agency_id")

feed = gtfs_realtime_pb2.FeedMessage()
feed.ParseFromString(
    (base / "service-alerts.pb").read_bytes()
)

observed_routes = set()
observed_trips = set()
observed_stops = set()
observed_agencies = set()

for entity in feed.entity:
    if not entity.HasField("alert"):
        continue

    for selector in entity.alert.informed_entity:
        if selector.route_id:
            observed_routes.add(selector.route_id)

        if selector.trip.trip_id:
            observed_trips.add(selector.trip.trip_id)

        if selector.stop_id:
            observed_stops.add(selector.stop_id)

        if selector.agency_id:
            observed_agencies.add(selector.agency_id)

print(
    "Routes:",
    len(observed_routes & route_ids),
    "/",
    len(observed_routes),
)
print(
    "Trips:",
    len(observed_trips & trip_ids),
    "/",
    len(observed_trips),
)
print(
    "Stops:",
    len(observed_stops & stop_ids),
    "/",
    len(observed_stops),
)
print(
    "Agencies:",
    len(observed_agencies & agency_ids),
    "/",
    len(observed_agencies),
)

print("\nUnmatched routes:", sorted(observed_routes - route_ids)[:20])
print("Unmatched trips:", sorted(observed_trips - trip_ids)[:20])
print("Unmatched stops:", sorted(observed_stops - stop_ids)[:20])
print("Unmatched agencies:", sorted(observed_agencies - agency_ids)[:20])
