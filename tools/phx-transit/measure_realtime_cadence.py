import csv
import hashlib
import os
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from google.transit import gtfs_realtime_pb2


BASE_INTERVAL_SECONDS = 30
TRIP_SAMPLE_COUNT = 20
ALERT_SAMPLE_EVERY_N_CYCLES = 2  # 60 seconds
REQUEST_TIMEOUT_SECONDS = 20

API_KEY_ENV_VAR = "VALLEY_METRO_API_KEY"
USER_AGENT = "PHX-Transit-Pulse-Verification/1.0"

ENDPOINTS = {
    "trip_updates": (
        "https://app.mecatran.com/utw/ws/gtfsfeed/"
        "realtime/valleymetro"
    ),
    "service_alerts": (
        "https://app.mecatran.com/utw/ws/gtfsfeed/"
        "alerts/valleymetro"
    ),
}

COLUMNS = [
    "feed_type",
    "sample",
    "request_utc",
    "http_status",
    "latency_ms",
    "content_type",
    "response_bytes",
    "etag",
    "cache_control",
    "server_date",
    "payload_sha256",
    "payload_changed",
    "header_timestamp",
    "header_changed",
    "feed_age_seconds",
    "entity_count",

    # Trip Updates metrics
    "trip_update_count",
    "trip_timestamp_count",
    "newest_trip_age_seconds",
    "oldest_trip_age_seconds",
    "trips_30s_or_newer",
    "trips_60s_or_newer",
    "trips_90s_or_newer",
    "trips_over_300s",
    "stop_time_update_count",
    "unique_route_ids",
    "unique_trip_ids",
    "unique_vehicle_ids",
    "unique_stop_ids",
    "arrival_time_count",
    "departure_time_count",
    "arrival_delay_present",
    "arrival_delay_negative",
    "arrival_delay_zero",
    "arrival_delay_positive",
    "departure_delay_present",
    "departure_delay_negative",
    "departure_delay_zero",
    "departure_delay_positive",
    "trip_schedule_relationships",
    "stop_schedule_relationships",

    # Service Alerts metrics
    "alert_count",
    "active_period_count",
    "alerts_active_now",
    "alerts_future_only",
    "alerts_expired_only",
    "alerts_inactive_other",
    "informed_entity_count",
    "alerts_with_url",
    "unique_agency_ids",
    "alert_causes",
    "alert_effects",
    "alert_severity_levels",

    "error",
]


def build_url(base_url: str, api_key: str) -> str:
    return base_url + "?" + urllib.parse.urlencode(
        {"apiKey": api_key}
    )


def enum_name(message, field_name: str, value: int) -> str:
    """Return a protobuf enum label without hard-coding enum classes."""
    try:
        field = message.DESCRIPTOR.fields_by_name[field_name]
        enum_value = field.enum_type.values_by_number.get(value)
        return enum_value.name if enum_value else str(value)
    except Exception:
        return str(value)


def format_counter(counter: Counter) -> str:
    return ";".join(
        f"{name}={count}"
        for name, count in sorted(counter.items())
    )


def base_row(
    feed_type: str,
    sample_number: int,
    request_time: datetime,
) -> dict:
    row = {column: "" for column in COLUMNS}
    row["feed_type"] = feed_type
    row["sample"] = sample_number
    row["request_utc"] = request_time.isoformat()
    return row


def parse_trip_updates(
    feed,
    row: dict,
    now_epoch: float,
) -> None:
    route_ids = set()
    trip_ids = set()
    vehicle_ids = set()
    stop_ids = set()
    trip_timestamps = []

    trip_relationships = Counter()
    stop_relationships = Counter()

    trip_update_count = 0
    stop_time_update_count = 0

    arrival_time_count = 0
    departure_time_count = 0

    arrival_delay_present = 0
    arrival_delay_negative = 0
    arrival_delay_zero = 0
    arrival_delay_positive = 0

    departure_delay_present = 0
    departure_delay_negative = 0
    departure_delay_zero = 0
    departure_delay_positive = 0

    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue

        update = entity.trip_update
        trip_update_count += 1

        if update.trip.route_id:
            route_ids.add(update.trip.route_id)

        if update.trip.trip_id:
            trip_ids.add(update.trip.trip_id)

        if update.vehicle.id:
            vehicle_ids.add(update.vehicle.id)

        if update.timestamp:
            trip_timestamps.append(update.timestamp)

        if update.trip.HasField("schedule_relationship"):
            label = enum_name(
                update.trip,
                "schedule_relationship",
                update.trip.schedule_relationship,
            )
            trip_relationships[label] += 1

        for stop_update in update.stop_time_update:
            stop_time_update_count += 1

            if stop_update.stop_id:
                stop_ids.add(stop_update.stop_id)

            if stop_update.HasField("schedule_relationship"):
                label = enum_name(
                    stop_update,
                    "schedule_relationship",
                    stop_update.schedule_relationship,
                )
                stop_relationships[label] += 1

            if stop_update.HasField("arrival"):
                arrival = stop_update.arrival

                if arrival.HasField("time"):
                    arrival_time_count += 1

                if arrival.HasField("delay"):
                    arrival_delay_present += 1

                    if arrival.delay < 0:
                        arrival_delay_negative += 1
                    elif arrival.delay == 0:
                        arrival_delay_zero += 1
                    else:
                        arrival_delay_positive += 1

            if stop_update.HasField("departure"):
                departure = stop_update.departure

                if departure.HasField("time"):
                    departure_time_count += 1

                if departure.HasField("delay"):
                    departure_delay_present += 1

                    if departure.delay < 0:
                        departure_delay_negative += 1
                    elif departure.delay == 0:
                        departure_delay_zero += 1
                    else:
                        departure_delay_positive += 1

    row["trip_update_count"] = trip_update_count
    row["stop_time_update_count"] = stop_time_update_count
    row["unique_route_ids"] = len(route_ids)
    row["unique_trip_ids"] = len(trip_ids)
    row["unique_vehicle_ids"] = len(vehicle_ids)
    row["unique_stop_ids"] = len(stop_ids)

    row["arrival_time_count"] = arrival_time_count
    row["departure_time_count"] = departure_time_count

    row["arrival_delay_present"] = arrival_delay_present
    row["arrival_delay_negative"] = arrival_delay_negative
    row["arrival_delay_zero"] = arrival_delay_zero
    row["arrival_delay_positive"] = arrival_delay_positive

    row["departure_delay_present"] = departure_delay_present
    row["departure_delay_negative"] = departure_delay_negative
    row["departure_delay_zero"] = departure_delay_zero
    row["departure_delay_positive"] = departure_delay_positive

    row["trip_schedule_relationships"] = format_counter(
        trip_relationships
    )
    row["stop_schedule_relationships"] = format_counter(
        stop_relationships
    )

    row["trip_timestamp_count"] = len(trip_timestamps)

    if trip_timestamps:
        ages = [
            max(0, now_epoch - timestamp)
            for timestamp in trip_timestamps
        ]

        row["newest_trip_age_seconds"] = round(min(ages), 1)
        row["oldest_trip_age_seconds"] = round(max(ages), 1)
        row["trips_30s_or_newer"] = sum(age <= 30 for age in ages)
        row["trips_60s_or_newer"] = sum(age <= 60 for age in ages)
        row["trips_90s_or_newer"] = sum(age <= 90 for age in ages)
        row["trips_over_300s"] = sum(age > 300 for age in ages)


def alert_period_is_active(period, now_epoch: float) -> bool:
    starts_before_now = (
        not period.start
        or period.start <= now_epoch
    )
    ends_after_now = (
        not period.end
        or period.end >= now_epoch
    )
    return starts_before_now and ends_after_now


def parse_service_alerts(
    feed,
    row: dict,
    now_epoch: float,
) -> None:
    route_ids = set()
    trip_ids = set()
    stop_ids = set()
    agency_ids = set()

    causes = Counter()
    effects = Counter()
    severities = Counter()

    alert_count = 0
    active_period_count = 0
    alerts_active_now = 0
    alerts_future_only = 0
    alerts_expired_only = 0
    alerts_inactive_other = 0
    informed_entity_count = 0
    alerts_with_url = 0

    for entity in feed.entity:
        if not entity.HasField("alert"):
            continue

        alert = entity.alert
        alert_count += 1

        periods = list(alert.active_period)
        active_period_count += len(periods)

        if any(
            alert_period_is_active(period, now_epoch)
            for period in periods
        ):
            alerts_active_now += 1
        elif periods and all(
            period.start and period.start > now_epoch
            for period in periods
        ):
            alerts_future_only += 1
        elif periods and all(
            period.end and period.end < now_epoch
            for period in periods
        ):
            alerts_expired_only += 1
        else:
            alerts_inactive_other += 1

        if alert.url.translation:
            alerts_with_url += 1

        if alert.HasField("cause"):
            causes[
                enum_name(alert, "cause", alert.cause)
            ] += 1

        if alert.HasField("effect"):
            effects[
                enum_name(alert, "effect", alert.effect)
            ] += 1

        if alert.HasField("severity_level"):
            severities[
                enum_name(
                    alert,
                    "severity_level",
                    alert.severity_level,
                )
            ] += 1

        informed_entity_count += len(alert.informed_entity)

        for selector in alert.informed_entity:
            if selector.agency_id:
                agency_ids.add(selector.agency_id)

            if selector.route_id:
                route_ids.add(selector.route_id)

            if selector.stop_id:
                stop_ids.add(selector.stop_id)

            if selector.trip.trip_id:
                trip_ids.add(selector.trip.trip_id)

    row["alert_count"] = alert_count
    row["active_period_count"] = active_period_count
    row["alerts_active_now"] = alerts_active_now
    row["alerts_future_only"] = alerts_future_only
    row["alerts_expired_only"] = alerts_expired_only
    row["alerts_inactive_other"] = alerts_inactive_other
    row["informed_entity_count"] = informed_entity_count
    row["alerts_with_url"] = alerts_with_url

    row["unique_route_ids"] = len(route_ids)
    row["unique_trip_ids"] = len(trip_ids)
    row["unique_stop_ids"] = len(stop_ids)
    row["unique_agency_ids"] = len(agency_ids)

    row["alert_causes"] = format_counter(causes)
    row["alert_effects"] = format_counter(effects)
    row["alert_severity_levels"] = format_counter(severities)


def fetch_and_measure(
    feed_type: str,
    sample_number: int,
    url: str,
    previous_state: dict,
) -> dict:
    request_time = datetime.now(timezone.utc)
    now_epoch = request_time.timestamp()
    row = base_row(feed_type, sample_number, request_time)

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT},
        )

        response_started = time.monotonic()

        with urllib.request.urlopen(
            request,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ) as response:
            payload = response.read()

            row["http_status"] = response.status
            row["content_type"] = response.headers.get(
                "Content-Type",
                "",
            )
            row["etag"] = response.headers.get("ETag", "")
            row["cache_control"] = response.headers.get(
                "Cache-Control",
                "",
            )
            row["server_date"] = response.headers.get("Date", "")

        row["latency_ms"] = round(
            (time.monotonic() - response_started) * 1000,
            1,
        )
        row["response_bytes"] = len(payload)

        payload_hash = hashlib.sha256(payload).hexdigest()
        row["payload_sha256"] = payload_hash

        previous_hash = previous_state.get("payload_hash")
        row["payload_changed"] = (
            previous_hash is not None
            and payload_hash != previous_hash
        )

        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(payload)

        header_timestamp = feed.header.timestamp
        row["header_timestamp"] = header_timestamp

        previous_header = previous_state.get("header_timestamp")
        row["header_changed"] = (
            previous_header is not None
            and header_timestamp != previous_header
        )

        if header_timestamp:
            row["feed_age_seconds"] = round(
                now_epoch - header_timestamp,
                1,
            )

        row["entity_count"] = len(feed.entity)

        if feed_type == "trip_updates":
            parse_trip_updates(feed, row, now_epoch)
        elif feed_type == "service_alerts":
            parse_service_alerts(feed, row, now_epoch)
        else:
            raise ValueError(f"Unsupported feed type: {feed_type}")

        previous_state["payload_hash"] = payload_hash
        previous_state["header_timestamp"] = header_timestamp

    except Exception as error:
        row["error"] = f"{type(error).__name__}: {error}"

    return row


def print_row_summary(row: dict) -> None:
    feed_type = row["feed_type"]
    sample = row["sample"]

    if row["error"]:
        print(
            f"{feed_type} {sample:02d} "
            f"ERROR: {row['error']}"
        )
        return

    if feed_type == "trip_updates":
        print(
            f"trip {sample:02d}/{TRIP_SAMPLE_COUNT} "
            f"status={row['http_status']} "
            f"trips={row['trip_update_count']} "
            f"stops={row['stop_time_update_count']} "
            f"age={row['feed_age_seconds']}s "
            f"changed={row['payload_changed']}"
        )
    else:
        alert_total = (
            TRIP_SAMPLE_COUNT
            // ALERT_SAMPLE_EVERY_N_CYCLES
        )
        print(
            f"alerts {sample:02d}/{alert_total} "
            f"status={row['http_status']} "
            f"alerts={row['alert_count']} "
            f"active={row['alerts_active_now']} "
            f"age={row['feed_age_seconds']}s "
            f"changed={row['payload_changed']}"
        )


def main() -> None:
    api_key = os.environ.get(API_KEY_ENV_VAR)

    if not api_key:
        raise RuntimeError(
            f"{API_KEY_ENV_VAR} is not set in this terminal."
        )

    urls = {
        feed_type: build_url(base_url, api_key)
        for feed_type, base_url in ENDPOINTS.items()
    }

    output_dir = Path("data/phx-transit/verification")
    output_dir.mkdir(parents=True, exist_ok=True)

    started_at = datetime.now(timezone.utc)
    output_path = output_dir / (
        "realtime-cadence-"
        + started_at.strftime("%Y%m%d-%H%M%S")
        + ".csv"
    )

    state = {
        "trip_updates": {},
        "service_alerts": {},
    }

    alert_sample_number = 0
    request_count = 0
    error_count = 0

    with output_path.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as output_file:
        writer = csv.DictWriter(
            output_file,
            fieldnames=COLUMNS,
        )
        writer.writeheader()

        for cycle_number in range(1, TRIP_SAMPLE_COUNT + 1):
            cycle_started = time.monotonic()

            trip_row = fetch_and_measure(
                "trip_updates",
                cycle_number,
                urls["trip_updates"],
                state["trip_updates"],
            )
            writer.writerow(trip_row)
            output_file.flush()
            print_row_summary(trip_row)

            request_count += 1
            error_count += bool(trip_row["error"])

            should_poll_alerts = (
                (cycle_number - 1)
                % ALERT_SAMPLE_EVERY_N_CYCLES
                == 0
            )

            if should_poll_alerts:
                alert_sample_number += 1

                alert_row = fetch_and_measure(
                    "service_alerts",
                    alert_sample_number,
                    urls["service_alerts"],
                    state["service_alerts"],
                )
                writer.writerow(alert_row)
                output_file.flush()
                print_row_summary(alert_row)

                request_count += 1
                error_count += bool(alert_row["error"])

            if cycle_number < TRIP_SAMPLE_COUNT:
                elapsed = time.monotonic() - cycle_started
                time.sleep(
                    max(
                        0,
                        BASE_INTERVAL_SECONDS - elapsed,
                    )
                )

    print(f"\nRequests: {request_count}")
    print(f"Errors: {error_count}")
    print("Results:", output_path.resolve())


if __name__ == "__main__":
    main()
