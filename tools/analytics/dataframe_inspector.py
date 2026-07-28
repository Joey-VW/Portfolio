"""Small dataframe profiling helper without cloud or charting dependencies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd


def _json_safe(value: Any) -> Any:
    """Return predictable scalar values for reports and tests."""
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, (pd.Timestamp, pd.Timedelta)):
        return str(value)
    return value


@dataclass(frozen=True)
class DataFrameInspector:
    """Summarize dataframe shape, types, missingness, and representative values."""

    dataframe: pd.DataFrame
    sample_limit: int = 5

    def __post_init__(self) -> None:
        if self.sample_limit < 1:
            raise ValueError("sample_limit must be at least 1")

    def as_records(self) -> list[dict[str, Any]]:
        """Return one stable summary record per column."""
        records: list[dict[str, Any]] = []
        for column in self.dataframe.columns:
            series = self.dataframe[column]
            examples = [_json_safe(value) for value in series.dropna().unique()[: self.sample_limit]]
            record: dict[str, Any] = {
                "column": str(column),
                "dtype": str(series.dtype),
                "missing": int(series.isna().sum()),
                "unique": int(series.nunique(dropna=True)),
                "examples": examples,
            }
            if pd.api.types.is_numeric_dtype(series):
                record["numeric"] = {
                    key: _json_safe(value)
                    for key, value in {
                        "min": series.min(),
                        "p25": series.quantile(0.25),
                        "median": series.median(),
                        "p75": series.quantile(0.75),
                        "max": series.max(),
                        "mean": series.mean(),
                    }.items()
                }
            else:
                record["numeric"] = None
            records.append(record)
        return records

    def generate_summary(self) -> pd.DataFrame:
        """Return a dataframe for compatibility with the legacy helper."""
        return pd.DataFrame(self.as_records())
