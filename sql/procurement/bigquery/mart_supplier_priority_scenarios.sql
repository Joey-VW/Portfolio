-- BigQuery / GoogleSQL adaptation of the supplier decision-support scenarios.
-- Grain: one row per Supplier x Decision_Scenario.
-- Scores expose explicit priorities; they are not a universal supplier recommendation.

WITH scenario_weights AS (
    SELECT *
    FROM UNNEST([
        STRUCT(
            'balanced_performance' AS Decision_Scenario,
            0.25 AS Savings_Weight,
            0.25 AS On_Time_Weight,
            0.25 AS Defect_Weight,
            0.25 AS Compliance_Weight
        ),
        STRUCT(
            'cost_savings_priority' AS Decision_Scenario,
            0.55 AS Savings_Weight,
            0.15 AS On_Time_Weight,
            0.15 AS Defect_Weight,
            0.15 AS Compliance_Weight
        ),
        STRUCT(
            'delivery_reliability_priority' AS Decision_Scenario,
            0.15 AS Savings_Weight,
            0.55 AS On_Time_Weight,
            0.15 AS Defect_Weight,
            0.15 AS Compliance_Weight
        ),
        STRUCT(
            'quality_compliance_priority' AS Decision_Scenario,
            0.15 AS Savings_Weight,
            0.15 AS On_Time_Weight,
            0.40 AS Defect_Weight,
            0.30 AS Compliance_Weight
        )
    ])
),

supplier_kpis AS (
    SELECT
        Supplier,
        SUM(Savings_Value) / NULLIF(SUM(Gross_Value), 0) AS Savings_Rate,
        CAST(COUNTIF(On_Time) AS FLOAT64)
            / NULLIF(COUNTIF(Delivered), 0) AS On_Time_Rate,
        SUM(IF(Defect_Eligible, Defective_Units, NULL))
            / NULLIF(SUM(IF(Defect_Eligible, Quantity, NULL)), 0) AS Defect_Rate,
        CAST(COUNTIF(Compliance = 'Yes') AS FLOAT64)
            / NULLIF(COUNT(*), 0) AS Compliance_Rate
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    GROUP BY Supplier
),

normalized_supplier_kpis AS (
    SELECT
        *,
        CASE
            WHEN MAX(Savings_Rate) OVER () = MIN(Savings_Rate) OVER () THEN 1.0
            ELSE (Savings_Rate - MIN(Savings_Rate) OVER ())
                / NULLIF(MAX(Savings_Rate) OVER () - MIN(Savings_Rate) OVER (), 0)
        END AS Normalized_Savings_Rate,
        CASE
            WHEN MAX(On_Time_Rate) OVER () = MIN(On_Time_Rate) OVER () THEN 1.0
            ELSE (On_Time_Rate - MIN(On_Time_Rate) OVER ())
                / NULLIF(MAX(On_Time_Rate) OVER () - MIN(On_Time_Rate) OVER (), 0)
        END AS Normalized_On_Time_Rate,
        CASE
            WHEN MAX(Defect_Rate) OVER () = MIN(Defect_Rate) OVER () THEN 1.0
            ELSE 1 - (
                (Defect_Rate - MIN(Defect_Rate) OVER ())
                / NULLIF(MAX(Defect_Rate) OVER () - MIN(Defect_Rate) OVER (), 0)
            )
        END AS Normalized_Defect_Rate,
        CASE
            WHEN MAX(Compliance_Rate) OVER () = MIN(Compliance_Rate) OVER () THEN 1.0
            ELSE (Compliance_Rate - MIN(Compliance_Rate) OVER ())
                / NULLIF(
                    MAX(Compliance_Rate) OVER () - MIN(Compliance_Rate) OVER (),
                    0
                )
        END AS Normalized_Compliance_Rate
    FROM supplier_kpis
),

scored_scenarios AS (
    SELECT
        supplier.*,
        scenario.*,
        CASE
            WHEN supplier.Savings_Rate IS NULL
                OR supplier.On_Time_Rate IS NULL
                OR supplier.Defect_Rate IS NULL
                OR supplier.Compliance_Rate IS NULL
                THEN 'insufficient_data'
            ELSE 'available'
        END AS Score_Status,
        (
            supplier.Normalized_Savings_Rate * scenario.Savings_Weight
            + supplier.Normalized_On_Time_Rate * scenario.On_Time_Weight
            + supplier.Normalized_Defect_Rate * scenario.Defect_Weight
            + supplier.Normalized_Compliance_Rate * scenario.Compliance_Weight
        ) AS Weighted_Score
    FROM normalized_supplier_kpis AS supplier
    CROSS JOIN scenario_weights AS scenario
)

SELECT
    *,
    CASE WHEN Score_Status = 'available' THEN
        ROW_NUMBER() OVER (
            PARTITION BY Decision_Scenario
            ORDER BY Weighted_Score DESC, Supplier ASC
        )
    END AS Scenario_Rank
FROM scored_scenarios
ORDER BY
    Decision_Scenario,
    Scenario_Rank,
    Supplier
