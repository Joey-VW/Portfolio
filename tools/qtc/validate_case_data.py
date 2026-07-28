"""Validate the committed Quote-to-Cash browser artifact."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "data" / "quote-to-cash-workflow-audit.json"


def main() -> None:
    payload = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    assert payload["meta"]["fictional"] is True
    assert payload["meta"]["seed"] == 20250630
    assert [row["stage"] for row in payload["funnel"]] == [
        "Opportunities",
        "Closed won",
        "Activated",
        "Recognized",
    ]
    assert all(row["count"] >= 0 for row in payload["funnel"])
    assert all(payload["stageTimes"][key]["count"] > 0 for key in ("close", "activation", "recognition"))
    assert payload["endToEnd"]["count"] == payload["funnel"][-1]["count"]
    scenario = payload["activationTargetScenario"]
    assert scenario["cohortCount"] == payload["stageTimes"]["activation"]["count"]
    assert [row["targetDays"] for row in scenario["targets"]] == list(range(5, 31))
    assert all(
        row["recordsAboveTarget"] <= scenario["cohortCount"]
        and row["excessActivationDays"] >= 0
        for row in scenario["targets"]
    )
    assert payload["exceptions"]
    print("Quote-to-Cash case data valid")


if __name__ == "__main__":
    main()
