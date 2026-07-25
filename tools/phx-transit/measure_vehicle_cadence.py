import csv
import hashlib
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from google.transit import gtfs_realtime_pb2


INTERVAL_SECONDS = 30
SAMPLE_COUNT = 20

api_key = os.environ.get("VALLEY_METRO_API_KEY")

if not api_key:
    raise RuntimeError(
        "VALLEY_METRO_API_KEY is not set in this terminal."
    )

base_url = (
    "https://app.mecatran.com/utw/ws/gtfsfeed/"
    "vehicles/valleymetro"
)

url = base_url + "?" + urllib.parse.urlencode(
    {"apiKey": api_key}
)

output_dir = Path("data/phx-transit/verification")
output_dir.mkdir(parents=True, exist_ok=True)

started_at = datetime.now(timezone.utc)

output_path = output_dir / (
    "vehicle-cadence-"
    + started_at.strftime("%Y%m%d-%H%M%S")
    + ".csv"
)

columns = [
    "sample",
    "request_utc",
    "http_status",
    "latency_ms",
    "content_type",
    "response_bytes",
    "etag",
    "payload_sha256",
    "payload_changed",
    "header_timestamp",
    "header_changed",
    "feed_age_seconds",
    "entity_count",
    "vehicle_timestamp_count",
    "newest_vehicle_age_seconds",
    "oldest_vehicle_age_seconds",
    "vehicles_30s_or_newer",
    "vehicles_60s_or_newer",
    "vehicles_90s_or_newer",
    "vehicles_over_300s",
    "error",
]

previous_hash = None
previous_header_timestamp = None

with output_path.open(
    "w",
    encoding="utf-8",
    newline="",
) as output_file:
    writer = csv.DictWriter(
        output_file,
        fieldnames=columns,
    )
    writer.writeheader()

    for sample_number in range(1, SAMPLE_COUNT + 1):
        cycle_started = time.monotonic()
        request_time = datetime.now(timezone.utc)
        now_epoch = request_time.timestamp()

        row = {
            column: ""
            for column in columns
        }

        row["sample"] = sample_number
        row["request_utc"] = request_time.isoformat()

        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": (
                        "PHX-Transit-Pulse-Verification/1.0"
                    )
                },
            )

            response_started = time.monotonic()

            with urllib.request.urlopen(
                request,
                timeout=20,
            ) as response:
                payload = response.read()

                row["http_status"] = response.status
                row["content_type"] = response.headers.get(
                    "Content-Type",
                    "",
                )
                row["etag"] = response.headers.get(
                    "ETag",
                    "",
                )

            row["latency_ms"] = round(
                (
                    time.monotonic()
                    - response_started
                )
                * 1000,
                1,
            )

            row["response_bytes"] = len(payload)

            payload_hash = hashlib.sha256(
                payload
            ).hexdigest()

            row["payload_sha256"] = payload_hash
            row["payload_changed"] = (
                previous_hash is not None
                and payload_hash != previous_hash
            )

            feed = gtfs_realtime_pb2.FeedMessage()
            feed.ParseFromString(payload)

            header_timestamp = feed.header.timestamp

            row["header_timestamp"] = header_timestamp
            row["header_changed"] = (
                previous_header_timestamp is not None
                and header_timestamp
                != previous_header_timestamp
            )

            if header_timestamp:
                row["feed_age_seconds"] = round(
                    now_epoch - header_timestamp,
                    1,
                )

            row["entity_count"] = len(feed.entity)

            vehicle_timestamps = []

            for entity in feed.entity:
                if not entity.HasField("vehicle"):
                    continue

                timestamp = entity.vehicle.timestamp

                if timestamp:
                    vehicle_timestamps.append(timestamp)

            row["vehicle_timestamp_count"] = len(
                vehicle_timestamps
            )

            if vehicle_timestamps:
                ages = [
                    max(0, now_epoch - timestamp)
                    for timestamp in vehicle_timestamps
                ]

                row["newest_vehicle_age_seconds"] = round(
                    min(ages),
                    1,
                )
                row["oldest_vehicle_age_seconds"] = round(
                    max(ages),
                    1,
                )
                row["vehicles_30s_or_newer"] = sum(
                    age <= 30
                    for age in ages
                )
                row["vehicles_60s_or_newer"] = sum(
                    age <= 60
                    for age in ages
                )
                row["vehicles_90s_or_newer"] = sum(
                    age <= 90
                    for age in ages
                )
                row["vehicles_over_300s"] = sum(
                    age > 300
                    for age in ages
                )

            previous_hash = payload_hash
            previous_header_timestamp = header_timestamp

            print(
                f"{sample_number:02d}/{SAMPLE_COUNT} "
                f"status={row['http_status']} "
                f"entities={row['entity_count']} "
                f"feed_age={row['feed_age_seconds']}s "
                f"fresh_90s={row['vehicles_90s_or_newer']} "
                f"changed={row['payload_changed']}"
            )

        except Exception as error:
            row["error"] = (
                f"{type(error).__name__}: {error}"
            )

            print(
                f"{sample_number:02d}/{SAMPLE_COUNT} "
                f"ERROR: {row['error']}"
            )

        writer.writerow(row)
        output_file.flush()

        if sample_number < SAMPLE_COUNT:
            elapsed = (
                time.monotonic()
                - cycle_started
            )

            time.sleep(
                max(
                    0,
                    INTERVAL_SECONDS - elapsed,
                )
            )

print("\nResults:", output_path.resolve())
