#!/usr/bin/env python3
"""Validate the EV true-cost foundation dataset and baseline calculations."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "ev-true-cost.json"
TOLERANCE = 0.015


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"EV true-cost validation failed: {message}")


def positive(value: object, label: str, allow_zero: bool = False) -> float:
    require(isinstance(value, (int, float)) and math.isfinite(value), f"{label} must be finite numeric")
    if allow_zero:
        require(value >= 0, f"{label} must be non-negative")
    else:
        require(value > 0, f"{label} must be positive")
    return float(value)


def calc(annual_miles: float, mpg: float, gas: float, kwh100: float, home_rate: float, public_rate: float, home_pct: float, charger_cost: float) -> dict[str, float | None]:
    ice_annual = annual_miles / mpg * gas
    ice_cpm = ice_annual / annual_miles
    ev_kwh = annual_miles * kwh100 / 100
    blended = (home_pct / 100) * home_rate + (1 - home_pct / 100) * public_rate
    ev_annual = ev_kwh * blended
    ev_cpm = ev_annual / annual_miles
    savings = ice_annual - ev_annual
    public_only = ev_kwh * public_rate
    charging_savings = public_only - ev_annual
    payback = charger_cost / charging_savings * 12 if charger_cost > 0 and home_pct > 0 and charging_savings > 0 else None
    return {"iceAnnual": ice_annual, "iceCpm": ice_cpm, "evKwh": ev_kwh, "evAnnual": ev_annual, "evCpm": ev_cpm, "savings": savings, "payback": payback}


def assert_close(actual: float, expected: float, label: str, tolerance: float = TOLERANCE) -> None:
    require(abs(actual - expected) <= tolerance, f"{label}: expected {expected}, got {actual}")


def main() -> None:
    data = json.loads(DATA.read_text())
    for key in ["schemaVersion", "project", "provenanceLevels", "sources", "vehicles", "inputs", "charging", "presets", "plannedTotalCostModel"]:
        require(key in data, f"missing top-level {key}")
    require("privateWorkingContext" not in data, "private working context must not be in public JSON")

    inputs = data["inputs"]
    annual = positive(inputs["annualMiles"]["value"], "annualMiles")
    mpg = positive(data["vehicles"]["iceBaseline"]["combinedMpg"], "iceBaseline.combinedMpg")
    gas = positive(inputs["gasPricePerGallonUsd"]["value"], "gasPricePerGallonUsd")
    kwh100 = positive(inputs["evKwhPer100Miles"]["value"], "evKwhPer100Miles")
    home = positive(inputs["homeRatePerKwhUsd"]["value"], "homeRatePerKwhUsd")
    charger = positive(inputs["homeChargerInstalledCostUsd"]["value"], "homeChargerInstalledCostUsd", allow_zero=True)

    session = data["charging"]["confirmedSessions"][0]
    public_rate = positive(session["totalPaidUsd"], "totalPaidUsd") / positive(session["energyDeliveredKwh"], "energyDeliveredKwh")
    assert_close(public_rate, session["effectiveAllInRatePerKwhUsd"], "effective public rate", 0.000001)

    expected = {
        "public-now": (0, 3456.77, 0.2305, -852.23),
        "mixed-future": (80, 1375.35, 0.0917, 1229.19),
        "home-future": (100, 855.00, 0.0570, 1749.55),
    }
    base = calc(annual, mpg, gas, kwh100, home, public_rate, 0, charger)
    assert_close(base["iceAnnual"], 2604.55, "gasoline annual")
    assert_close(base["iceCpm"], 0.1736, "gasoline cost/mile", 0.00005)
    assert_close(base["evKwh"], 5700, "annual EV kWh", 0.001)
    for preset in data["presets"]:
        require(abs(preset["homeChargingSharePct"] + preset["publicChargingSharePct"] - 100) < 1e-9, f"{preset['id']} shares must total 100")
        home_pct, annual_expected, cpm_expected, savings_expected = expected[preset["id"]]
        require(home_pct == preset["homeChargingSharePct"], f"unexpected home share for {preset['id']}")
        result = calc(annual, mpg, gas, kwh100, home, public_rate, home_pct, charger)
        assert_close(result["evAnnual"], annual_expected, f"{preset['id']} annual")
        assert_close(result["evCpm"], cpm_expected, f"{preset['id']} cpm", 0.00005)
        assert_close(result["savings"], savings_expected, f"{preset['id']} savings")
        if preset["id"] == "home-future":
            assert_close(result["payback"], 9.2, "home charger payback", 0.05)
    print("EV true-cost validation passed")


if __name__ == "__main__":
    main()
