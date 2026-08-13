"""Validate the committed Procurement browser artifact."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "data" / "procurement-kpi-analysis.json"
SOURCE = ROOT / "data" / "procurement-source.csv"


def main() -> None:
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    assert payload["meta"]["generatedBy"] == "tools/procurement/build_case_data.py"
    normalized_source = SOURCE.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
    assert payload["meta"]["source"]["sha256"] == hashlib.sha256(normalized_source).hexdigest()
    assert payload["quality"]["rows"] == payload["meta"]["source"]["rows"]
    assert len(payload["suppliers"]) >= 2
    assert len(payload["categories"]) >= 2
    assert len(payload["monthly"]) >= 2
    assert len(payload["temporalRows"]) == payload["quality"]["rows"]
    helper_fields = ("Order_Month", "Order_Week_Start", "Delivery_Month", "Delivery_Week_Start")
    for row in payload["temporalRows"]:
        assert all(row[field] for field in helper_fields[:2])
        assert (row["Delivery_Month"] is None) == (row["Delivery_Week_Start"] is None)
        assert row["orderStatus"]
        assert (row["leadDays"] is None) == (not row["delivered"])
    for supplier in payload["suppliers"]:
        assert set(supplier["scores"]) == {"balanced", "cost", "reliability", "quality"}
        if supplier["scoreStatus"] == "available":
            assert not supplier["missingScoreMetrics"]
            assert all(0 <= score <= 100 for score in supplier["scores"].values())
        else:
            assert supplier["missingScoreMetrics"]
            assert all(score is None for score in supplier["scores"].values())
    for category in payload["categories"]:
        assert len(category["monthly"]) >= 2
    print("Procurement case data valid")


if __name__ == "__main__":
    main()
