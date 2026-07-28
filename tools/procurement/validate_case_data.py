"""Validate the committed Procurement browser artifact."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "data" / "procurement-kpi-analysis.json"


def main() -> None:
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    assert payload["meta"]["generatedBy"] == "tools/procurement/build_case_data.py"
    assert payload["quality"]["rows"] == payload["meta"]["source"]["rows"]
    assert len(payload["suppliers"]) >= 2
    assert len(payload["categories"]) >= 2
    assert len(payload["monthly"]) >= 2
    for supplier in payload["suppliers"]:
        assert set(supplier["scores"]) == {"balanced", "cost", "reliability", "quality"}
        assert all(0 <= score <= 100 for score in supplier["scores"].values())
    print("Procurement case data valid")


if __name__ == "__main__":
    main()
