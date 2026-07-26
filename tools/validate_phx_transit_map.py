#!/usr/bin/env python3
"""Validate the PHX Transit Pulse synthetic geographic fixture."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "data" / "phx-transit" / "synthetic" / "operations-replay.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def valid_coordinate(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_point(
    record: dict[str, object],
    label: str,
    bounds: list[list[float]],
) -> None:
    longitude = record.get("longitude")
    latitude = record.get("latitude")
    require(valid_coordinate(longitude), f"{label} has an invalid longitude")
    require(valid_coordinate(latitude), f"{label} has an invalid latitude")
    west, south = bounds[0]
    east, north = bounds[1]
    require(west <= longitude <= east, f"{label} longitude is outside the approved bounds")
    require(south <= latitude <= north, f"{label} latitude is outside the approved bounds")


def validate() -> tuple[int, int, int, int]:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    require(meta.get("providerData") is False, "providerData must remain false")
    require(
        meta.get("fixtureKind") == "synthetic-operations-demo",
        "fixtureKind must identify the synthetic operations demo",
    )
    require(
        meta.get("geography") == "fictional-phoenix-area-overlay",
        "geography must identify the fictional overlay",
    )

    map_config = data.get("map")
    require(isinstance(map_config, dict), "map configuration is required")
    bounds = map_config.get("bounds")
    require(
        isinstance(bounds, list)
        and len(bounds) == 2
        and all(isinstance(point, list) and len(point) == 2 for point in bounds),
        "map bounds must contain southwest and northeast coordinate pairs",
    )
    for index, point in enumerate(bounds):
        require(all(valid_coordinate(value) for value in point), f"map bound {index} is invalid")
    require(bounds[0][0] < bounds[1][0], "map west bound must be less than east bound")
    require(bounds[0][1] < bounds[1][1], "map south bound must be less than north bound")
    validate_point(
        {"longitude": map_config.get("center", [None, None])[0],
         "latitude": map_config.get("center", [None, None])[1]},
        "map center",
        bounds,
    )

    routes = data.get("routes", [])
    route_ids = {route.get("id") for route in routes}
    require(len(route_ids) == len(routes), "route IDs must be unique")
    for route in routes:
        route_id = route.get("id")
        require(route.get("path"), f"route {route_id} must retain its schematic path")
        geometry = route.get("geometry", {})
        require(geometry.get("type") == "LineString", f"route {route_id} must use LineString geometry")
        coordinates = geometry.get("coordinates")
        require(
            isinstance(coordinates, list) and len(coordinates) >= 2,
            f"route {route_id} must contain at least two geographic coordinates",
        )
        for index, coordinate in enumerate(coordinates):
            require(
                isinstance(coordinate, list) and len(coordinate) == 2,
                f"route {route_id} coordinate {index} must be a coordinate pair",
            )
            validate_point(
                {"longitude": coordinate[0], "latitude": coordinate[1]},
                f"route {route_id} coordinate {index}",
                bounds,
            )

    stops = data.get("stops", [])
    stop_ids = {stop.get("id") for stop in stops}
    require(len(stop_ids) == len(stops), "stop IDs must be unique")
    for stop in stops:
        stop_id = stop.get("id")
        require(valid_coordinate(stop.get("x")) and valid_coordinate(stop.get("y")),
                f"stop {stop_id} must retain schematic coordinates")
        validate_point(stop, f"stop {stop_id}", bounds)
        require(set(stop.get("routes", [])).issubset(route_ids),
                f"stop {stop_id} references an unknown route")

    frames = data.get("frames", [])
    require(frames, "at least one replay frame is required")
    baseline_vehicle_ids: set[object] | None = None
    vehicle_total = 0
    alert_total = 0
    for frame_index, frame in enumerate(frames):
        vehicles = frame.get("vehicles", [])
        vehicle_ids = {vehicle.get("id") for vehicle in vehicles}
        require(len(vehicle_ids) == len(vehicles), f"frame {frame_index} vehicle IDs must be unique")
        if baseline_vehicle_ids is None:
            baseline_vehicle_ids = vehicle_ids
        else:
            require(vehicle_ids == baseline_vehicle_ids,
                    f"frame {frame_index} must preserve the replay vehicle ID set")
        for vehicle in vehicles:
            vehicle_id = vehicle.get("id")
            require(valid_coordinate(vehicle.get("x")) and valid_coordinate(vehicle.get("y")),
                    f"vehicle {vehicle_id} must retain schematic coordinates")
            validate_point(vehicle, f"vehicle {vehicle_id} in frame {frame_index}", bounds)
            require(vehicle.get("routeId") in route_ids | {None},
                    f"vehicle {vehicle_id} references an unknown route")
        vehicle_total += len(vehicles)

        alerts = frame.get("alerts", [])
        alert_ids = {alert.get("id") for alert in alerts}
        require(len(alert_ids) == len(alerts), f"frame {frame_index} alert IDs must be unique")
        for alert in alerts:
            alert_id = alert.get("id")
            require(valid_coordinate(alert.get("x")) and valid_coordinate(alert.get("y")),
                    f"alert {alert_id} must retain schematic coordinates")
            validate_point(alert, f"alert {alert_id} in frame {frame_index}", bounds)
            require(set(alert.get("routes", [])).issubset(route_ids),
                    f"alert {alert_id} references an unknown route")
            require(set(alert.get("stops", [])).issubset(stop_ids),
                    f"alert {alert_id} references an unknown stop")
        alert_total += len(alerts)

    return len(routes), len(stops), vehicle_total, alert_total


if __name__ == "__main__":
    route_count, stop_count, vehicle_count, alert_count = validate()
    print(
        "PHX Transit synthetic map fixture valid: "
        f"{route_count} routes, {stop_count} stops, "
        f"{vehicle_count} vehicle positions, {alert_count} alert positions."
    )
