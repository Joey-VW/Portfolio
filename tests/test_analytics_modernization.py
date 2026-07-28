from __future__ import annotations

import json
import unittest
from pathlib import Path

import pandas as pd

from tools.analytics.dataframe_inspector import DataFrameInspector
from tools.procurement.build_case_data import (
    DataQualityError,
    build_artifact,
    enrich,
    read_source,
    summarize,
    validate_source,
)
from tools.qtc.build_case_data import analyze
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


if __name__ == "__main__":
    unittest.main()
