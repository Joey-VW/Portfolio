from __future__ import annotations

import json
import unittest
from pathlib import Path

import pandas as pd

from tools.analytics.dataframe_inspector import DataFrameInspector
from tools.procurement.build_case_data import (
    DataQualityError,
    add_scores,
    build_artifact,
    enrich,
    read_source,
    summarize,
    validate_source,
)
from tools.qtc.build_case_data import analyze, build_activation_target_scenarios
from tools.qtc.generate_mock_data import generate

ROOT = Path(__file__).resolve().parents[1]


class DataFrameInspectorTests(unittest.TestCase):
    def test_summary_is_limited_and_json_safe(self) -> None:
        frame = pd.DataFrame({"number": [1, 2, None], "label": ["a", "b", "c"]})
        summary = DataFrameInspector(frame, sample_limit=2).as_records()
        self.assertEqual(summary[0]["missing"], 1)
        self.assertEqual(summary[1]["examples"], ["a", "b"])
        json.dumps(summary)

    def test_rejects_invalid_sample_limit(self) -> None:
        with self.assertRaises(ValueError):
            DataFrameInspector(pd.DataFrame(), sample_limit=0)


class ProcurementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_path = ROOT / "data" / "procurement-source.csv"
        cls.source = read_source(cls.source_path)

    def test_source_contract_and_artifact(self) -> None:
        quality = validate_source(self.source)
        artifact = build_artifact(self.source, self.source_path)
        self.assertEqual(quality["rows"], 777)
        self.assertEqual(artifact["meta"]["source"]["rows"], 777)
        self.assertEqual(len(artifact["suppliers"]), 5)
        self.assertEqual(len(artifact["categories"]), 5)

    def test_duplicate_purchase_order_stops_build(self) -> None:
        invalid = pd.concat([self.source, self.source.iloc[[0]]], ignore_index=True)
        with self.assertRaises(DataQualityError):
            validate_source(invalid)

    def test_required_fields_reject_nulls(self) -> None:
        required_fields = (
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
        for field in required_fields:
            with self.subTest(field=field):
                invalid = self.source.copy()
                invalid.loc[invalid.index[0], field] = None
                with self.assertRaisesRegex(DataQualityError, field):
                    validate_source(invalid)

    def test_metric_denominators_quarantine_missing_values(self) -> None:
        sample = pd.DataFrame(
            [
                {
                    "PO_ID": "A",
                    "Supplier": "One",
                    "Order_Date": pd.Timestamp("2025-01-01"),
                    "Delivery_Date": pd.Timestamp("2025-01-06"),
                    "Item_Category": "MRO",
                    "Order_Status": "Delivered",
                    "Quantity": 10,
                    "Unit_Price": 10.0,
                    "Negotiated_Price": 9.0,
                    "Defective_Units": 1.0,
                    "Compliance": "Yes",
                },
                {
                    "PO_ID": "B",
                    "Supplier": "One",
                    "Order_Date": pd.Timestamp("2025-01-10"),
                    "Delivery_Date": pd.NaT,
                    "Item_Category": "MRO",
                    "Order_Status": "Pending",
                    "Quantity": 20,
                    "Unit_Price": 10.0,
                    "Negotiated_Price": 8.0,
                    "Defective_Units": None,
                    "Compliance": "No",
                },
            ]
        )
        result = summarize(enrich(sample), "One")
        self.assertEqual(result["onTimeRate"], 1.0)
        self.assertEqual(result["defectRate"], 0.1)
        self.assertEqual(result["missingDeliveryRate"], 0.5)

    def test_missing_score_kpi_is_not_imputed_or_ranked(self) -> None:
        suppliers = [
            {
                "name": "Complete",
                "savingsRate": 0.1,
                "onTimeRate": 0.8,
                "defectRate": 0.05,
                "complianceRate": 0.9,
            },
            {
                "name": "Unknown quality",
                "savingsRate": 0.2,
                "onTimeRate": 0.9,
                "defectRate": None,
                "complianceRate": 1.0,
            },
        ]
        add_scores(suppliers)
        self.assertEqual(suppliers[0]["scoreStatus"], "available")
        self.assertTrue(all(score is not None for score in suppliers[0]["scores"].values()))
        self.assertEqual(suppliers[1]["scoreStatus"], "insufficient-data")
        self.assertEqual(suppliers[1]["missingScoreMetrics"], ["defectRate"])
        self.assertTrue(all(score is None for score in suppliers[1]["scores"].values()))

    def test_category_monthly_summaries_match_category_orders(self) -> None:
        artifact = build_artifact(self.source, self.source_path)
        aggregate_rates = [row["onTimeRate"] for row in artifact["monthly"]]
        for category in artifact["categories"]:
            with self.subTest(category=category["name"]):
                self.assertEqual(sum(row["orders"] for row in category["monthly"]), category["orders"])
        self.assertTrue(
            any(
                [row["onTimeRate"] for row in category["monthly"]] != aggregate_rates
                for category in artifact["categories"]
            )
        )


class QuoteToCashTests(unittest.TestCase):
    def test_generator_and_analysis_are_deterministic(self) -> None:
        first = analyze(generate())
        second = analyze(generate())
        self.assertEqual(first, second)
        self.assertTrue(first["meta"]["fictional"])
        self.assertLess(first["funnel"][-1]["count"], first["funnel"][0]["count"])

    def test_incomplete_records_are_measured(self) -> None:
        result = analyze(generate())
        exceptions = {row["type"]: row["count"] for row in result["exceptions"]}
        self.assertGreater(exceptions["Won opportunity without activation"], 0)
        self.assertGreater(exceptions["Recognition backlog"], 0)
        self.assertGreater(exceptions["Broken opportunity link"], 0)
        self.assertGreater(exceptions["Duplicate subscription ID"], 0)

    def test_end_to_end_duration_uses_a_coherent_record(self) -> None:
        entities = {
            "opportunities": [
                {
                    "opportunity_id": "OPP-1",
                    "created_date": "2025-01-01",
                    "close_date": "2025-01-11",
                    "stage": "Closed Won",
                    "segment": "SMB",
                }
            ],
            "subscriptions": [
                {
                    "subscription_id": "SUB-1",
                    "opportunity_id": "OPP-1",
                    "start_date": "2025-01-16",
                    "status": "Active",
                }
            ],
            "revenue": [
                {
                    "revenue_id": "REV-1",
                    "subscription_id": "SUB-1",
                    "recognition_date": "2025-01-31",
                }
            ],
        }
        result = analyze(entities)
        self.assertEqual(result["endToEnd"]["count"], 1)
        self.assertEqual(result["endToEnd"]["median"], 30)
        self.assertEqual(result["stageTimes"]["close"]["median"], 10)
        self.assertEqual(result["stageTimes"]["activation"]["median"], 5)
        self.assertEqual(result["stageTimes"]["recognition"]["median"], 15)

    def test_activation_target_scenario_uses_empirical_distribution(self) -> None:
        scenario = build_activation_target_scenarios([5, 10, 20])
        target = next(row for row in scenario["targets"] if row["targetDays"] == 10)
        self.assertEqual(scenario["cohortCount"], 3)
        self.assertEqual(target["recordsAboveTarget"], 1)
        self.assertAlmostEqual(target["shareAboveTarget"], 1 / 3)
        self.assertEqual(target["excessActivationDays"], 10)
        self.assertEqual(target["modeledP90"], 10.0)

    def test_activation_target_scenario_is_deterministic(self) -> None:
        first = analyze(generate())["activationTargetScenario"]
        second = analyze(generate())["activationTargetScenario"]
        self.assertEqual(first, second)
        counts = [row["recordsAboveTarget"] for row in first["targets"]]
        self.assertNotEqual(len(set(counts)), 1)


if __name__ == "__main__":
    unittest.main()
