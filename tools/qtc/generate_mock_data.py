"""Generate deterministic, transparently fictional Quote-to-Cash source entities."""

from __future__ import annotations

import argparse
import csv
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SEED = 20250630
RECORD_COUNT = 600

SEGMENTS = ("SMB", "Mid-market", "Enterprise")
SEGMENT_WEIGHTS = (0.48, 0.34, 0.18)
PLANS = ("Starter", "Growth", "Scale", "Enterprise")
PLAN_VALUES = {"Starter": 4800, "Growth": 15000, "Scale": 42000, "Enterprise": 120000}


def iso(value: date | None) -> str:
    return "" if value is None else value.isoformat()


def generate(seed: int = SEED, record_count: int = RECORD_COUNT) -> dict[str, list[dict[str, Any]]]:
    """Return separate CRM, billing, and revenue entity lists."""
    rng = random.Random(seed)
    opportunities: list[dict[str, Any]] = []
    subscriptions: list[dict[str, Any]] = []
    revenue: list[dict[str, Any]] = []
    start = date(2024, 1, 1)

    for index in range(1, record_count + 1):
        opportunity_id = f"OPP-{index:04d}"
        segment = rng.choices(SEGMENTS, SEGMENT_WEIGHTS, k=1)[0]
        plan = rng.choices(PLANS, (0.32, 0.34, 0.24, 0.10), k=1)[0]
        created = start + timedelta(days=rng.randrange(0, 540))
        outcome = rng.random()
        if outcome < 0.68:
            stage = "Closed Won"
        elif outcome < 0.92:
            stage = "Closed Lost"
        else:
            stage = "Open"
        close_days = rng.randint(5, 38)
        if index % 47 == 0:
            close_days += rng.randint(35, 70)
        close = None if stage == "Open" else created + timedelta(days=close_days)
        amount = round(PLAN_VALUES[plan] * rng.uniform(0.72, 1.45), 2)
        opportunities.append(
            {
                "opportunity_id": opportunity_id,
                "created_date": iso(created),
                "close_date": iso(close),
                "stage": stage,
                "segment": segment,
                "plan": plan,
                "amount": amount,
            }
        )

        create_subscription = stage == "Closed Won" and rng.random() < 0.88
        if stage == "Closed Lost" and index % 53 == 0:
            create_subscription = True
        if not create_subscription:
            continue
        subscription_id = f"SUB-{index:04d}"
        activation_days = rng.randint(1, 22)
        if index % 41 == 0:
            activation_days += rng.randint(25, 55)
        activation = close + timedelta(days=activation_days) if close else None
        if index % 89 == 0 and close:
            activation = close - timedelta(days=rng.randint(1, 5))
        status_roll = rng.random()
        status = "Active" if status_roll < 0.82 else "Suspended" if status_roll < 0.92 else "Pending"
        if status == "Pending" and index % 3 == 0:
            activation = None
        subscriptions.append(
            {
                "subscription_id": subscription_id,
                "opportunity_id": opportunity_id,
                "start_date": iso(activation),
                "status": status,
                "billing_status": "Current" if status == "Active" else "Hold",
                "plan": plan,
                "annual_value": amount,
            }
        )

        create_revenue = activation is not None and rng.random() < (0.91 if status == "Active" else 0.52)
        if activation is None and index % 101 == 0:
            create_revenue = True
        if not create_revenue:
            continue
        recognition_days = rng.randint(2, 28)
        if index % 37 == 0:
            recognition_days += rng.randint(28, 60)
        recognition = (activation or close or created) + timedelta(days=recognition_days)
        if index % 97 == 0 and activation:
            recognition = activation - timedelta(days=rng.randint(1, 4))
        revenue.append(
            {
                "revenue_id": f"REV-{index:04d}",
                "subscription_id": subscription_id,
                "recognition_date": iso(recognition),
                "recognized_amount": round(amount / 12, 2),
                "status": "Recognized",
            }
        )

    # Intentional cross-system exceptions make the audit meaningful.
    subscriptions.extend(
        [
            {
                "subscription_id": "SUB-BROKEN-1",
                "opportunity_id": "OPP-MISSING-1",
                "start_date": "2025-03-10",
                "status": "Active",
                "billing_status": "Current",
                "plan": "Growth",
                "annual_value": 18000,
            },
            {
                "subscription_id": subscriptions[0]["subscription_id"],
                **{key: value for key, value in subscriptions[0].items() if key != "subscription_id"},
            },
        ]
    )
    revenue.extend(
        [
            {
                "revenue_id": "REV-BROKEN-1",
                "subscription_id": "SUB-MISSING-1",
                "recognition_date": "2025-04-15",
                "recognized_amount": 1200,
                "status": "Recognized",
            },
            {
                "revenue_id": revenue[0]["revenue_id"],
                **{key: value for key, value in revenue[0].items() if key != "revenue_id"},
            },
        ]
    )
    return {"opportunities": opportunities, "subscriptions": subscriptions, "revenue": revenue}


def write_csvs(entities: dict[str, list[dict[str, Any]]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in entities.items():
        path = output_dir / f"{name}.csv"
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--records", type=int, default=RECORD_COUNT)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data" / "qtc-source")
    args = parser.parse_args()
    write_csvs(generate(args.seed, args.records), args.output_dir)
    print(f"Wrote deterministic QTC source fixtures to {args.output_dir}")


if __name__ == "__main__":
    main()
