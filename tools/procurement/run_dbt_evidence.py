"""Run and independently reconcile the compact Procurement dbt-duckdb evidence layer."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.procurement.run_sql_evidence import (  # noqa: E402
    reconcile_order_metrics,
    reconcile_quality_exceptions,
    reconcile_status_delivery,
    reconcile_supplier_category,
    reconcile_supplier_monthly,
    reconcile_supplier_scenarios,
    validate_source_contract,
)

SOURCE = ROOT / "data" / "procurement-source.csv"
DBT_DIR = ROOT / "dbt" / "procurement"
DATABASE = ROOT / ".local" / "procurement_dbt.duckdb"


def _dbt_executable() -> str:
    executable = shutil.which("dbt")
    if executable:
        return executable
    raise RuntimeError(
        "dbt executable not found. Install with "
        "`python -m pip install -r dbt/procurement/requirements.txt`."
    )


def _run(executable: str, *command: str) -> None:
    # In dbt Core 1.10, project/profile paths are command options rather than
    # top-level options, so they must follow the selected subcommand.
    args = [
        executable,
        *command,
        "--project-dir",
        str(DBT_DIR),
        "--profiles-dir",
        str(DBT_DIR),
    ]
    print(f"\n[{' '.join(command)}]", flush=True)
    subprocess.run(args, cwd=ROOT, check=True)


def _reset_database() -> None:
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    for disposable in (DATABASE, Path(f"{DATABASE}.wal")):
        if disposable.exists():
            disposable.unlink()


def main() -> int:
    source_contract = validate_source_contract(SOURCE)
    executable = _dbt_executable()
    _reset_database()

    subprocess.run([executable, "--version"], cwd=ROOT, check=True)
    for command in ("debug", "compile", "run", "test"):
        _run(executable, command)
    _run(executable, "docs", "generate")

    order = reconcile_order_metrics(DATABASE, SOURCE)
    benchmark = reconcile_supplier_category(DATABASE, SOURCE)
    monthly = reconcile_supplier_monthly(DATABASE, SOURCE)
    exceptions = reconcile_quality_exceptions(DATABASE, SOURCE)
    reconciliation = reconcile_status_delivery(DATABASE, SOURCE)
    scenarios = reconcile_supplier_scenarios(DATABASE, SOURCE)

    print(
        "\nCanonical source contract passed: "
        f"{source_contract['rows']} rows / "
        f"{source_contract['unique_po_ids']} unique PO_IDs / "
        f"{source_contract['suppliers']} suppliers / "
        f"{source_contract['categories']} categories"
    )
    print(f"Rebuilt dbt-duckdb model chain: {DATABASE}")
    print(
        "dbt order metrics reconciled: "
        f"{order['rows']} rows / {order['unique_po_ids']} unique PO_IDs / "
        f"{order['impossible_deliveries']} impossible / {order['delivered']} delivered / "
        f"{order['on_time']} on time / {order['defect_eligible']} defect-eligible / "
        f"{order['noncompliant']} noncompliant"
    )
    print(
        "dbt supplier/category mart reconciled: "
        f"{benchmark['rows']} rows / {benchmark['unique_grain_rows']} unique grain rows / "
        f"{benchmark['orders']} orders / {benchmark['delivered']} delivered / "
        f"{benchmark['on_time']} on time / {benchmark['defect_eligible']} defect-eligible / "
        f"{benchmark['compliant']} compliant"
    )
    print(
        "dbt supplier/month mart reconciled: "
        f"{monthly['rows']} rows / {monthly['suppliers']} suppliers / "
        f"{monthly['months']} months / {monthly['zero_order_months']} zero-order spine months"
    )
    print(
        "dbt quality exceptions reconciled: "
        f"{exceptions['rows']} rows / {exceptions['missing_deliveries']} missing deliveries / "
        f"{exceptions['missing_defects']} missing defect observations / "
        f"{exceptions['impossible_deliveries']} impossible deliveries"
    )
    print(
        "dbt status/delivery reconciliation: "
        f"{reconciliation['rows']} rows / "
        f"{reconciliation['classifications']} classifications / "
        f"{reconciliation['completion_status_missing_delivery']} completion statuses missing delivery / "
        f"{reconciliation['noncompletion_status_with_valid_delivery']} noncompletion statuses with valid delivery"
    )
    print(
        "dbt supplier scenarios reconciled: "
        f"{scenarios['rows']} rows / {scenarios['suppliers']} suppliers / "
        f"{scenarios['scenarios']} scenarios"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
