#!/usr/bin/env python3
"""Validate the PHX Transit Pulse synthetic geographic fixture and replay."""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "data" / "phx-transit" / "synthetic" / "operations-replay.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def valid_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def distance(a: list[float], b: list[float]) -> float:
    longitude_scale = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * longitude_scale, a[1] - b[1])


def point_to_segment(point: list[float], start: list[float], end: list[float]) -> float:
    scale = math.cos(math.radians(point[1]))
    px, py = point[0] * scale, point[1]
    ax, ay = start[0] * scale, start[1]
    bx, by = end[0] * scale, end[1]
    dx, dy = bx - ax, by - ay
    ratio = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy) if dx or dy else 0
    ratio = max(0, min(1, ratio))
    return math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy))


def distance_to_line(point: list[float], coordinates: list[list[float]]) -> float:
    return min(point_to_segment(point, start, end) for start, end in zip(coordinates, coordinates[1:]))


def point_along(coordinates: list[list[float]], progress: float) -> list[float]:
    lengths = [distance(start, end) for start, end in zip(coordinates, coordinates[1:])]
    remaining = sum(lengths) * progress
    for index, length in enumerate(lengths):
        if remaining <= length or index == len(lengths) - 1:
            ratio = remaining / length if length else 0
            return [coordinates[index][axis] + (coordinates[index + 1][axis] - coordinates[index][axis]) * ratio for axis in (0, 1)]
        remaining -= length
    return coordinates[-1]


def validate_coordinate(point: list[float], label: str, bounds: list[list[float]]) -> None:
    require(len(point) == 2 and all(valid_number(value) for value in point), f"{label} is not a coordinate pair")
    require(bounds[0][0] <= point[0] <= bounds[1][0], f"{label} longitude is outside map bounds")
    require(bounds[0][1] <= point[1] <= bounds[1][1], f"{label} latitude is outside map bounds")


def validate() -> tuple[int, int, int, int]:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    require(meta.get("providerData") is False, "providerData must remain false")
    require(meta.get("fixtureKind") == "synthetic-operations-demo", "fixture must remain explicitly synthetic")
    require(meta.get("geography") == "fictional-phoenix-area-overlay", "geography must identify the fictional overlay")
    require(len(data.get("frames", [])) == 4, "deterministic replay must retain exactly four frames")

    bounds = data.get("map", {}).get("bounds")
    require(isinstance(bounds, list) and len(bounds) == 2, "map bounds are required")
    for index, point in enumerate(bounds):
        validate_coordinate(point, f"map bound {index}", bounds)

    routes = data.get("routes", [])
    route_ids = {route.get("id") for route in routes}
    require(len(route_ids) == len(routes), "route IDs must be unique")
    patterns: dict[str, tuple[str, dict]] = {}
    for route in routes:
        route_id = route.get("id")
        require("geometry" not in route and "path" not in route,
                f"route {route_id} must derive display geometry from its canonical pattern")
        require(len(route.get("patterns", [])) >= 2, f"route {route_id} requires directional patterns")
        for pattern in route["patterns"]:
            pattern_id = pattern.get("id")
            require(pattern_id not in patterns, f"pattern ID {pattern_id} is duplicated")
            coordinates = pattern.get("geometry", {}).get("coordinates", [])
            require(pattern.get("geometry", {}).get("type") == "LineString" and len(coordinates) >= 2,
                    f"pattern {pattern_id} requires LineString geometry")
            for index, coordinate in enumerate(coordinates):
                validate_coordinate(coordinate, f"pattern {pattern_id} coordinate {index}", bounds)
            require(pattern.get("headsign") and pattern.get("stopIds"), f"pattern {pattern_id} requires a headsign and ordered stops")
            patterns[pattern_id] = (route_id, pattern)
        display_pattern_id = route.get("displayPatternId")
        require(display_pattern_id in patterns and patterns[display_pattern_id][0] == route_id,
                f"route {route_id} requires a canonical display pattern")

    stops = data.get("stops", [])
    stop_by_id = {stop.get("id"): stop for stop in stops}
    require(len(stop_by_id) == len(stops), "stop IDs must be unique")
    for stop_id, stop in stop_by_id.items():
        point = [stop.get("longitude"), stop.get("latitude")]
        validate_coordinate(point, f"stop {stop_id}", bounds)
        require(set(stop.get("routes", [])).issubset(route_ids), f"stop {stop_id} references an unknown route")
        for route_id in stop.get("routes", []):
            matching = [pattern for owner, pattern in patterns.values() if owner == route_id and stop_id in pattern["stopIds"]]
            require(matching, f"stop {stop_id} is absent from route {route_id} patterns")
            require(min(distance_to_line(point, pattern["geometry"]["coordinates"]) for pattern in matching) <= 0.00005,
                    f"stop {stop_id} is not on route {route_id}")
    for pattern_id, (_, pattern) in patterns.items():
        coordinates = pattern["geometry"]["coordinates"]
        ordered = pattern["stopIds"]
        require(distance([stop_by_id[ordered[0]]["longitude"], stop_by_id[ordered[0]]["latitude"]], coordinates[0]) <= 0.00005,
                f"pattern {pattern_id} must begin at its first stop")
        require(distance([stop_by_id[ordered[-1]]["longitude"], stop_by_id[ordered[-1]]["latitude"]], coordinates[-1]) <= 0.00005,
                f"pattern {pattern_id} must end at its last stop")

    progress_by_vehicle: dict[str, list[float]] = {}
    vehicle_total = alert_total = 0
    baseline_ids = None
    for frame_index, frame in enumerate(data["frames"]):
        ids = {vehicle.get("id") for vehicle in frame.get("vehicles", [])}
        require(len(ids) == len(frame.get("vehicles", [])), f"frame {frame_index} vehicle IDs must be unique")
        require(baseline_ids in (None, ids), f"frame {frame_index} changes the replay vehicle set")
        baseline_ids = ids
        for vehicle in frame["vehicles"]:
            if vehicle.get("routeId") is None:
                validate_coordinate([vehicle.get("longitude"), vehicle.get("latitude")], f"unassigned vehicle {vehicle['id']}", bounds)
                continue
            pattern_id = vehicle.get("patternId")
            require(pattern_id in patterns, f"vehicle {vehicle['id']} references an unknown pattern")
            route_id, pattern = patterns[pattern_id]
            require(route_id == vehicle.get("routeId"), f"vehicle {vehicle['id']} pattern does not belong to its route")
            progress = vehicle.get("progress")
            require(valid_number(progress) and 0 <= progress <= 1, f"vehicle {vehicle['id']} has invalid progress")
            point = point_along(pattern["geometry"]["coordinates"], progress)
            validate_coordinate(point, f"vehicle {vehicle['id']} derived position", bounds)
            require(distance_to_line(point, pattern["geometry"]["coordinates"]) <= 0.000001,
                    f"vehicle {vehicle['id']} is off its pattern")
            progress_by_vehicle.setdefault(vehicle["id"], []).append(progress)
        vehicle_total += len(frame["vehicles"])
        for alert in frame.get("alerts", []):
            require(set(alert.get("routes", [])).issubset(route_ids), f"alert {alert['id']} references an unknown route")
            require(set(alert.get("stops", [])).issubset(stop_by_id), f"alert {alert['id']} references an unknown stop")
            pattern_id = alert.get("patternId")
            segment = alert.get("segmentProgress")
            require(pattern_id in patterns and isinstance(segment, list) and len(segment) == 2,
                    f"alert {alert['id']} requires a valid pattern segment")
            require(0 <= segment[0] < segment[1] <= 1, f"alert {alert['id']} has invalid segment progress")
            require(patterns[pattern_id][0] in alert["routes"], f"alert {alert['id']} segment is not on an affected route")
        alert_total += len(frame.get("alerts", []))
        for trip in frame.get("tripStates", []):
            stop_id = trip.get("stopId")
            require("stop" not in trip, f"trip state {trip['tripId']} must resolve labels from stopId")
            require(stop_id is None or stop_id in stop_by_id,
                    f"trip state {trip['tripId']} references an unknown stop")
    for vehicle_id, values in progress_by_vehicle.items():
        require(all(after > before for before, after in zip(values, values[1:])),
                f"vehicle {vehicle_id} progress must increase consistently along its directional pattern")
    serialized = json.dumps(data)
    for stale_label in ("Mesa Gateway", "Westgate", "Copper Square"):
        require(stale_label not in serialized, f"fixture retains stale stop label {stale_label}")

    return len(routes), len(stops), vehicle_total, alert_total


if __name__ == "__main__":
    counts = validate()
    print(f"PHX Transit synthetic map fixture valid: {counts[0]} routes, {counts[1]} stops, "
          f"{counts[2]} vehicle progress records, {counts[3]} valid alert segments.")
