"""Build the Quote-to-Cash browser artifact with stage-specific cohorts."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import mean, median
from typing import Any, Iterable

try:
    from .generate_mock_data import RECORD_COUNT, SEED, generate
except ImportError:
    from generate_mock_data import RECORD_COUNT, SEED, generate

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "data" / "quote-to-cash-workflow-audit.json"
SLOW_THRESHOLDS = {"close": 45, "activation": 30, "recognition": 35}


def parse(value: str) -> date | None:
    return date.fromisoformat(value) if value else None


def percentile(values: list[int], fraction: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def describe(values: list[int]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "average": None, "median": None, "p75": None, "p90": None}
    return {
        "count": len(values),
        "average": round(mean(values), 1),
        "median": round(median(values), 1),
        "p75": round(percentile(values, 0.75), 1),
        "p90": round(percentile(values, 0.90), 1),
    }


def unique_rows(rows: Iterable[dict[str, Any]], key: str) -> tuple[dict[str, dict[str, Any]], int]:
    result: dict[str, dict[str, Any]] = {}
    duplicates = 0
    for row in rows:
        identifier = row[key]
        if identifier in result:
            duplicates += 1
            continue
        result[identifier] = row
    return result, duplicates


def analyze(entities: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    opportunities, duplicate_opportunities = unique_rows(entities["opportunities"], "opportunity_id")
    subscriptions, duplicate_subscriptions = unique_rows(entities["subscriptions"], "subscription_id")
    revenues, duplicate_revenue = unique_rows(entities["revenue"], "revenue_id")
    revenue_by_subscription = {row["subscription_id"]: row for row in revenues.values()}

    exceptions: Counter[str] = Counter()
    exceptions["Duplicate opportunity ID"] = duplicate_opportunities
    exceptions["Duplicate subscription ID"] = duplicate_subscriptions
    exceptions["Duplicate revenue ID"] = duplicate_revenue

    won = [row for row in opportunities.values() if row["stage"] == "Closed Won"]
    close_durations: list[int] = []
    activation_durations: list[int] = []
    recognition_durations: list[int] = []
    valid_subscriptions: list[dict[str, Any]] = []
    valid_recognized: list[dict[str, Any]] = []

    for opportunity in won:
        created, closed = parse(opportunity["created_date"]), parse(opportunity["close_date"])
        if created and closed and closed >= created:
            days = (closed - created).days
            close_durations.append(days)
            if days > SLOW_THRESHOLDS["close"]:
                exceptions["Slow close"] += 1
        else:
            exceptions["Impossible close sequence"] += 1

    for subscription in subscriptions.values():
        opportunity = opportunities.get(subscription["opportunity_id"])
        if not opportunity:
            exceptions["Broken opportunity link"] += 1
            continue
        if opportunity["stage"] != "Closed Won":
            exceptions["Subscription on ineligible opportunity"] += 1
            continue
        closed, activated = parse(opportunity["close_date"]), parse(subscription["start_date"])
        if not activated:
            exceptions["Missing activation"] += 1
            continue
        if not closed or activated < closed:
            exceptions["Impossible activation sequence"] += 1
            continue
        days = (activated - closed).days
        activation_durations.append(days)
        if days > SLOW_THRESHOLDS["activation"]:
            exceptions["Slow activation"] += 1
        if subscription["status"] == "Suspended":
            exceptions["Suspended subscription"] += 1
        valid_subscriptions.append(subscription)

        revenue = revenue_by_subscription.get(subscription["subscription_id"])
        if not revenue:
            exceptions["Recognition backlog"] += 1
            continue
        recognized = parse(revenue["recognition_date"])
        if not recognized or recognized < activated:
            exceptions["Impossible recognition sequence"] += 1
            continue
        recognition_days = (recognized - activated).days
        recognition_durations.append(recognition_days)
        if recognition_days > SLOW_THRESHOLDS["recognition"]:
            exceptions["Slow recognition"] += 1
        valid_recognized.append(revenue)

    valid_subscription_ids = {item["subscription_id"] for item in valid_subscriptions}
    for revenue in revenues.values():
        if revenue["subscription_id"] not in subscriptions:
            exceptions["Broken subscription link"] += 1
        elif revenue["subscription_id"] not in valid_subscription_ids:
            subscription = subscriptions[revenue["subscription_id"]]
            if not subscription["start_date"]:
                exceptions["Recognition without activation"] += 1

    linked_won_ids = {
        item["opportunity_id"]
        for item in valid_subscriptions
        if item["opportunity_id"] in opportunities
    }
    exceptions["Won opportunity without activation"] = len(
        {row["opportunity_id"] for row in won}.difference(linked_won_ids)
    )

    stages = {
        "close": describe(close_durations),
        "activation": describe(activation_durations),
        "recognition": describe(recognition_durations),
    }
    bottleneck = max(stages, key=lambda key: stages[key]["median"] or 0)
    segment_rows = []
    for segment in ("SMB", "Mid-market", "Enterprise"):
        segment_opportunities = [row for row in opportunities.values() if row["segment"] == segment]
        segment_won = [row for row in segment_opportunities if row["stage"] == "Closed Won"]
        segment_won_ids = {row["opportunity_id"] for row in segment_won}
        segment_subscriptions = [row for row in valid_subscriptions if row["opportunity_id"] in segment_won_ids]
        segment_subscription_ids = {row["subscription_id"] for row in segment_subscriptions}
        segment_recognized = [
            row for row in valid_recognized if row["subscription_id"] in segment_subscription_ids
        ]
        segment_rows.append(
            {
                "segment": segment,
                "opportunities": len(segment_opportunities),
                "won": len(segment_won),
                "activated": len(segment_subscriptions),
                "recognized": len(segment_recognized),
            }
        )

    exception_rows = [
        {"type": name, "count": count}
        for name, count in sorted(exceptions.items(), key=lambda item: (-item[1], item[0]))
        if count
    ]
    return {
        "meta": {
            "title": "Where Revenue Gets Stuck",
            "subtitle": "Quote-to-Cash Workflow Audit",
            "generatedBy": "tools/qtc/build_case_data.py",
            "fictional": True,
            "seed": SEED,
            "rules": {
                "records": RECORD_COUNT,
                "slowThresholdDays": SLOW_THRESHOLDS,
                "systems": ["CRM opportunities", "Billing subscriptions", "Revenue recognition"],
            },
        },
        "funnel": [
            {"stage": "Opportunities", "count": len(opportunities), "rate": 1.0},
            {"stage": "Closed won", "count": len(won), "rate": len(won) / len(opportunities)},
            {
                "stage": "Activated",
                "count": len(valid_subscriptions),
                "rate": len(valid_subscriptions) / len(won) if won else 0,
            },
            {
                "stage": "Recognized",
                "count": len(valid_recognized),
                "rate": len(valid_recognized) / len(valid_subscriptions) if valid_subscriptions else 0,
            },
        ],
        "stageTimes": stages,
        "bottleneck": {
            "stage": bottleneck,
            "medianDays": stages[bottleneck]["median"],
            "totalMedianDays": round(sum(stage["median"] or 0 for stage in stages.values()), 1),
        },
        "exceptions": exception_rows,
        "segments": segment_rows,
        "entityCounts": {
            "opportunities": len(entities["opportunities"]),
            "subscriptions": len(entities["subscriptions"]),
            "revenue": len(entities["revenue"]),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = analyze(generate())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
