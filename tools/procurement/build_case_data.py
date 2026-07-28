"""Validate procurement source data and build the browser-ready case-study artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
from pathlib import Path
import sys
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from tools.analytics.dataframe_inspector import DataFrameInspector

DEFAULT_INPUT = ROOT / "data" / "procurement-source.csv"
DEFAULT_OUTPUT = ROOT / "data" / "procurement-kpi-analysis.json"
ON_TIME_DAYS = 10
KNOWN_COMPLIANCE = {"Yes", "No"}
KNOWN_STATUSES = {"Delivered", "Partially Delivered", "Pending", "Cancelled"}
REQUIRED_NON_NULL_FIELDS = (
    "PO_ID",
    "Supplier",
    "Order_Date",
    "Item_Category",
    "Order_Status",
    "Quantity",
    "Unit_Price",
    "Negotiated_Price",
    "Compliance",
)
PRESET_WEIGHTS = {
    "balanced": {"cost": 0.25, "reliability": 0.25, "quality": 0.25, "compliance": 0.25},
    "cost": {"cost": 0.55, "reliability": 0.15, "quality": 0.15, "compliance": 0.15},
    "reliability": {"cost": 0.15, "reliability": 0.55, "quality": 0.15, "compliance": 0.15},
    "quality": {"cost": 0.15, "reliability": 0.15, "quality": 0.40, "compliance": 0.30},
}


class DataQualityError(ValueError):
    """Raised when the source violates a blocking data contract rule."""


def read_source(path: Path) -> pd.DataFrame:
    """Read and type the source without modifying it."""
    frame = pd.read_csv(path)
    for column in ("Order_Date", "Delivery_Date"):
        frame[column] = pd.to_datetime(frame[column], errors="coerce")
    return frame


def validate_source(frame: pd.DataFrame) -> dict[str, int]:
    """Apply blocking rules and return measured, non-blocking quality signals."""
    required = {
        "PO_ID",
        "Supplier",
        "Order_Date",
        "Delivery_Date",
        "Item_Category",
        "Order_Status",
        "Quantity",
        "Unit_Price",
        "Negotiated_Price",
        "Defective_Units",
        "Compliance",
    }
    missing_columns = sorted(required.difference(frame.columns))
    failures: list[str] = []
    if missing_columns:
        raise DataQualityError(f"Missing required columns: {', '.join(missing_columns)}")
    for field in REQUIRED_NON_NULL_FIELDS:
        if frame[field].isna().any():
            failures.append(f"{field} must not contain null values")
    if frame["PO_ID"].duplicated().any():
        failures.append("PO_ID must be unique")
    if (frame["Quantity"] <= 0).any():
        failures.append("Quantity must be greater than zero")
    if (frame[["Unit_Price", "Negotiated_Price"]] <= 0).any().any():
        failures.append("Prices must be greater than zero")
    invalid_defects = frame["Defective_Units"].notna() & (
        (frame["Defective_Units"] < 0) | (frame["Defective_Units"] > frame["Quantity"])
    )
    if invalid_defects.any():
        failures.append("Defective_Units must be between zero and Quantity")
    unknown_compliance = sorted(set(frame["Compliance"].dropna()).difference(KNOWN_COMPLIANCE))
    if unknown_compliance:
        failures.append(f"Unknown compliance values: {unknown_compliance}")
    unknown_statuses = sorted(set(frame["Order_Status"].dropna()).difference(KNOWN_STATUSES))
    if unknown_statuses:
        failures.append(f"Unknown order statuses: {unknown_statuses}")
    impossible = frame["Delivery_Date"].notna() & (frame["Delivery_Date"] < frame["Order_Date"])
    if failures:
        raise DataQualityError("; ".join(failures))
    return {
        "rows": int(len(frame)),
        "missingDeliveries": int(frame["Delivery_Date"].isna().sum()),
        "missingDefectCounts": int(frame["Defective_Units"].isna().sum()),
        "cancelledOrders": int(frame["Order_Status"].eq("Cancelled").sum()),
        "pendingOrders": int(frame["Order_Status"].eq("Pending").sum()),
        "impossibleDeliverySequences": int(impossible.sum()),
    }


def enrich(frame: pd.DataFrame) -> pd.DataFrame:
    """Create one documented metric layer used by every summary."""
    result = frame.copy()
    result["Lead_Days"] = (result["Delivery_Date"] - result["Order_Date"]).dt.days
    result["Gross_Value"] = result["Unit_Price"] * result["Quantity"]
    result["Negotiated_Value"] = result["Negotiated_Price"] * result["Quantity"]
    result["Savings_Value"] = result["Gross_Value"] - result["Negotiated_Value"]
    result["Impossible_Delivery"] = result["Delivery_Date"].notna() & (
        result["Delivery_Date"] < result["Order_Date"]
    )
    result["Delivered"] = result["Delivery_Date"].notna() & ~result["Impossible_Delivery"]
    result["On_Time"] = result["Delivered"] & result["Lead_Days"].le(ON_TIME_DAYS)
    result["Defect_Eligible"] = result["Defective_Units"].notna()
    result["Noncompliant"] = result["Compliance"].eq("No")
    result["Order_Month"] = result["Order_Date"].dt.to_period("M").dt.to_timestamp()
    # pandas W-SAT periods end on Saturday and therefore start on Sunday.
    result["Order_Week_Start"] = result["Order_Date"].dt.to_period("W-SAT").dt.start_time
    return result


def _rate(numerator: float, denominator: float) -> float | None:
    return None if denominator == 0 else float(numerator / denominator)


def summarize(group: pd.DataFrame, label: str) -> dict[str, Any]:
    delivered = group[group["Delivered"]]
    defect_eligible = group[group["Defect_Eligible"]]
    return {
        "name": label,
        "orders": int(len(group)),
        "spend": round(float(group["Negotiated_Value"].sum()), 2),
        "avgUnitPrice": round(float(group["Unit_Price"].mean()), 2),
        "avgNegotiatedPrice": round(float(group["Negotiated_Price"].mean()), 2),
        "savingsRate": _rate(group["Savings_Value"].sum(), group["Gross_Value"].sum()),
        "avgLeadDays": None if delivered.empty else round(float(delivered["Lead_Days"].mean()), 2),
        "onTimeRate": _rate(delivered["On_Time"].sum(), len(delivered)),
        "defectRate": _rate(defect_eligible["Defective_Units"].sum(), defect_eligible["Quantity"].sum()),
        "complianceRate": _rate(group["Compliance"].eq("Yes").sum(), len(group)),
        "missingDeliveryRate": _rate(group["Delivery_Date"].isna().sum(), len(group)),
    }


def _normalize(values: dict[str, float], higher_is_better: bool = True) -> dict[str, float]:
    if not values:
        return {}
    low, high = min(values.values()), max(values.values())
    if high == low:
        return {key: 1.0 for key in values}
    normalized = {key: (value - low) / (high - low) for key, value in values.items()}
    if not higher_is_better:
        normalized = {key: 1 - value for key, value in normalized.items()}
    return normalized


def add_scores(suppliers: list[dict[str, Any]]) -> None:
    """Add transparent preset scores based on normalized supplier KPIs."""
    score_metrics = ("savingsRate", "onTimeRate", "defectRate", "complianceRate")
    eligible = [
        item
        for item in suppliers
        if all(item[metric] is not None for metric in score_metrics)
    ]
    cost = _normalize({item["name"]: item["savingsRate"] for item in eligible})
    reliability = _normalize({item["name"]: item["onTimeRate"] for item in eligible})
    quality = _normalize({item["name"]: item["defectRate"] for item in eligible}, False)
    compliance = _normalize({item["name"]: item["complianceRate"] for item in eligible})
    for supplier in suppliers:
        name = supplier["name"]
        missing_metrics = [metric for metric in score_metrics if supplier[metric] is None]
        supplier["scoreStatus"] = "insufficient-data" if missing_metrics else "available"
        supplier["missingScoreMetrics"] = missing_metrics
        if missing_metrics:
            supplier["scores"] = {preset: None for preset in PRESET_WEIGHTS}
            continue
        supplier["scores"] = {
            preset: round(
                100
                * (
                    cost[name] * weights["cost"]
                    + reliability[name] * weights["reliability"]
                    + quality[name] * weights["quality"]
                    + compliance[name] * weights["compliance"]
                ),
                1,
            )
            for preset, weights in PRESET_WEIGHTS.items()
        }


def summarize_monthly(group: pd.DataFrame) -> list[dict[str, Any]]:
    """Summarize monthly performance from the maintained metric layer."""
    return [
        {
            "month": month.strftime("%Y-%m"),
            "orders": int(len(month_group)),
            "spend": round(float(month_group["Negotiated_Value"].sum()), 2),
            "savingsRate": _rate(
                month_group["Savings_Value"].sum(),
                month_group["Gross_Value"].sum(),
            ),
            "onTimeRate": _rate(
                month_group["On_Time"].sum(),
                month_group["Delivered"].sum(),
            ),
            "defectRate": _rate(
                month_group.loc[month_group["Defect_Eligible"], "Defective_Units"].sum(),
                month_group.loc[month_group["Defect_Eligible"], "Quantity"].sum(),
            ),
        }
        for month, month_group in group.groupby("Order_Month", sort=True)
    ]


def build_artifact(frame: pd.DataFrame, source_path: Path) -> dict[str, Any]:
    quality = validate_source(frame)
    model = enrich(frame)
    suppliers = [summarize(group, name) for name, group in model.groupby("Supplier", sort=True)]
    add_scores(suppliers)
    categories = [
        {
            **summarize(group, name),
            "suppliers": [
                summarize(supplier_group, supplier_name)
                for supplier_name, supplier_group in group.groupby("Supplier", sort=True)
            ],
            "monthly": summarize_monthly(group),
        }
        for name, group in model.groupby("Item_Category", sort=True)
    ]
    monthly = summarize_monthly(model)
    source_bytes = source_path.read_bytes()
    return {
        "meta": {
            "title": "Procurement KPI Analysis",
            "generatedBy": "tools/procurement/build_case_data.py",
            "source": {
                "name": "Procurement KPI Analysis Dataset.csv",
                "publisher": "Shahriar Kabir on Kaggle",
                "datasetId": "shahriarkabir/procurement-kpi-analysis-dataset",
                "retrieved": "2026-07-28",
                "licenseClaim": "CC0: Public Domain, as listed by the dataset publisher",
                "sha256": hashlib.sha256(source_bytes).hexdigest(),
                "rows": int(len(frame)),
                "coverage": "2022–2023",
            },
            "assumptions": {
                "onTimeDeliveryDays": ON_TIME_DAYS,
                "weekPeriod": "W-SAT ends Saturday and starts Sunday",
                "defectRate": "Rows missing Defective_Units are excluded from the defect denominator",
                "deliveryRate": "Rows missing Delivery_Date are excluded from on-time delivery",
                "supplierScore": (
                    "Suppliers missing any required score KPI receive no comparable score"
                ),
            },
            "presetWeights": PRESET_WEIGHTS,
            "sourceProfile": DataFrameInspector(frame, sample_limit=3).as_records(),
        },
        "quality": quality,
        "overview": summarize(model, "All suppliers"),
        "suppliers": suppliers,
        "categories": categories,
        "monthly": monthly,
    }


def write_bigquery(frame: pd.DataFrame, table: str, project_id: str) -> None:
    """Optional cloud publication kept outside the browser-data requirement."""
    try:
        import pandas_gbq
    except ImportError as exc:
        raise RuntimeError("Install pandas-gbq to use --bigquery-table") from exc
    pandas_gbq.to_gbq(frame, table, project_id=project_id, if_exists="replace")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--bigquery-table")
    parser.add_argument("--gcp-project")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        source = read_source(args.input)
        artifact = build_artifact(source, args.input)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
        logging.info("Wrote %s from %s validated rows", args.output, len(source))
        if args.bigquery_table:
            if not args.gcp_project:
                raise ValueError("--gcp-project is required with --bigquery-table")
            write_bigquery(enrich(source), args.bigquery_table, args.gcp_project)
    except Exception:
        logging.exception("Procurement case-data build failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
