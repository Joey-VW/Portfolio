#!/usr/bin/env python3
"""Author a bus LineString from deliberate road anchors through OSRM.

The tool is authoring-only. It never edits the production fixture and the
portfolio page does not import or call it.
"""

from __future__ import annotations

import argparse
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_ENDPOINT = "https://router.project-osrm.org"
EARTH_RADIUS_METERS = 6_371_008.8


def haversine_meters(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (*first, *second))
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(value))


def point_segment_distance_meters(point: list[float], start: list[float], end: list[float]) -> float:
    reference_latitude = math.radians(point[1])
    scale_x = EARTH_RADIUS_METERS * math.cos(reference_latitude) * math.pi / 180
    scale_y = EARTH_RADIUS_METERS * math.pi / 180
    px, py = point[0] * scale_x, point[1] * scale_y
    ax, ay = start[0] * scale_x, start[1] * scale_y
    bx, by = end[0] * scale_x, end[1] * scale_y
    dx, dy = bx - ax, by - ay
    ratio = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy) if dx or dy else 0
    ratio = max(0, min(1, ratio))
    return math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy))


def simplify_rdp(coordinates: list[list[float]], tolerance_meters: float) -> list[list[float]]:
    if len(coordinates) <= 2:
        return coordinates
    start, end = coordinates[0], coordinates[-1]
    distances = [point_segment_distance_meters(point, start, end) for point in coordinates[1:-1]]
    maximum = max(distances, default=0)
    if maximum <= tolerance_meters:
        return [start, end]
    split = distances.index(maximum) + 1
    return (
        simplify_rdp(coordinates[: split + 1], tolerance_meters)[:-1]
        + simplify_rdp(coordinates[split:], tolerance_meters)
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path, help="JSON manifest containing routeId and ordered anchors")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="OSRM base URL")
    parser.add_argument("--tolerance-meters", type=float, default=10, help="Per-leg RDP tolerance")
    parser.add_argument("--max-snap-meters", type=float, default=5, help="Reject anchors beyond this snap distance")
    parser.add_argument("--output", type=Path, help="Optional JSON output path; omitted for a dry run")
    return parser.parse_args()


def request_route(endpoint: str, anchors: list[dict]) -> dict:
    coordinates = ";".join(
        f"{anchor['requested'][0]:.7f},{anchor['requested'][1]:.7f}" for anchor in anchors
    )
    query = urllib.parse.urlencode(
        {
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",
            "continue_straight": "false",
        }
    )
    url = f"{endpoint.rstrip('/')}/route/v1/driving/{coordinates}?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": "phx-transit-fixture-authoring/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = json.load(response)
    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise RuntimeError(f"OSRM route request failed: {payload.get('code', 'unknown error')}")
    return payload


def build_result(manifest: dict, payload: dict, endpoint: str, tolerance_meters: float) -> dict:
    route = payload["routes"][0]
    full_geometry = route["geometry"]["coordinates"]
    waypoints = payload["waypoints"]
    legs = route["legs"]
    snapped = [waypoint["location"] for waypoint in waypoints]

    waypoint_indexes: list[int] = []
    search_from = 0
    for waypoint in snapped:
        index = min(
            range(search_from, len(full_geometry)),
            key=lambda candidate: haversine_meters(waypoint, full_geometry[candidate]),
        )
        waypoint_indexes.append(index)
        search_from = index

    simplified: list[list[float]] = []
    for start_index, end_index in zip(waypoint_indexes, waypoint_indexes[1:]):
        leg_geometry = full_geometry[start_index : end_index + 1]
        if not leg_geometry:
            raise RuntimeError("OSRM geometry could not be divided at its waypoint anchors")
        leg_simplified = simplify_rdp(leg_geometry, tolerance_meters)
        simplified.extend(leg_simplified if not simplified else leg_simplified[1:])

    anchor_report = []
    for anchor, waypoint in zip(manifest["anchors"], waypoints):
        anchor_report.append(
            {
                "label": anchor["label"],
                "expectedRoad": anchor["expectedRoad"],
                "requested": anchor["requested"],
                "snapped": waypoint["location"],
                "osrmRoad": waypoint["name"] or None,
                "snapDistanceMeters": round(waypoint["distance"], 2),
            }
        )

    return {
        "routeId": manifest["routeId"],
        "endpoint": endpoint,
        "requestOptions": {
            "overview": "full",
            "geometries": "geojson",
            "steps": False,
            "continue_straight": False,
        },
        "toleranceMeters": tolerance_meters,
        "distanceMeters": route["distance"],
        "durationSeconds": route["duration"],
        "fullCoordinateCount": len(full_geometry),
        "coordinateCount": len(simplified),
        "anchors": anchor_report,
        "legs": [
            {
                "from": manifest["anchors"][index]["label"],
                "to": manifest["anchors"][index + 1]["label"],
                "distanceMeters": leg["distance"],
            }
            for index, leg in enumerate(legs)
        ],
        "geometry": {"type": "LineString", "coordinates": simplified},
    }


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    anchors = manifest.get("anchors", [])
    if len(anchors) < 2:
        raise ValueError("The manifest must contain at least two ordered anchors")

    payload = request_route(args.endpoint, anchors)
    result = build_result(manifest, payload, args.endpoint, args.tolerance_meters)
    rejected = [
        anchor for anchor in result["anchors"]
        if anchor["snapDistanceMeters"] > args.max_snap_meters
    ]
    if rejected:
        details = ", ".join(
            f"{anchor['label']} ({anchor['snapDistanceMeters']:.2f} m)"
            for anchor in rejected
        )
        raise ValueError(f"Anchor snap distance exceeds {args.max_snap_meters:g} m: {details}")

    print(
        f"{result['routeId']}: {result['distanceMeters'] / 1000:.3f} km, "
        f"{result['fullCoordinateCount']} full coordinates, "
        f"{result['coordinateCount']} coordinates at {args.tolerance_meters:g} m RDP"
    )
    print("Anchors:")
    for index, anchor in enumerate(result["anchors"]):
        print(
            f"  {index:02d} {anchor['label']}: requested={anchor['requested']} "
            f"snapped={anchor['snapped']} distance={anchor['snapDistanceMeters']:.2f} m "
            f"osrmRoad={anchor['osrmRoad'] or '(unnamed)'} "
            f"expectedRoad={anchor['expectedRoad']}"
        )
    print("Legs:")
    for index, leg in enumerate(result["legs"]):
        print(f"  {index:02d} {leg['from']} -> {leg['to']}: {leg['distanceMeters'] / 1000:.3f} km")

    if args.output:
        args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print("Dry run only; pass --output to save the authored geometry report.")


if __name__ == "__main__":
    main()
