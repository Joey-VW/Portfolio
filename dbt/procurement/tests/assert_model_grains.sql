-- Composite-grain and scenario-weight assertions not covered by built-in column tests.
SELECT
    'supplier_category_duplicate' AS violation,
    Supplier || '|' || Item_Category AS grain_key
FROM {{ ref('mart_supplier_category_benchmark') }}
GROUP BY Supplier, Item_Category
HAVING COUNT(*) <> 1

UNION ALL

SELECT
    'supplier_month_duplicate',
    Supplier || '|' || CAST(Order_Month AS VARCHAR)
FROM {{ ref('mart_supplier_monthly_trends') }}
GROUP BY Supplier, Order_Month
HAVING COUNT(*) <> 1

UNION ALL

SELECT
    'quality_exception_duplicate',
    PO_ID || '|' || Exception_Code
FROM {{ ref('mart_procurement_quality_exceptions') }}
GROUP BY PO_ID, Exception_Code
HAVING COUNT(*) <> 1

UNION ALL

SELECT
    'supplier_scenario_duplicate',
    Supplier || '|' || Decision_Scenario
FROM {{ ref('mart_supplier_priority_scenarios') }}
GROUP BY Supplier, Decision_Scenario
HAVING COUNT(*) <> 1

UNION ALL

SELECT
    'scenario_weight_total',
    Supplier || '|' || Decision_Scenario
FROM {{ ref('mart_supplier_priority_scenarios') }}
WHERE ABS(
    Savings_Weight + On_Time_Weight + Defect_Weight + Compliance_Weight - 1.0
) > 0.0000000001
