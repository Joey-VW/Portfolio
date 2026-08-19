-- BigQuery / GoogleSQL adaptation of the supplier monthly trend mart.
-- Grain: one row per Supplier x Order_Month, including months without orders.
-- A complete date spine prevents LAG and rolling windows from skipping inactive months.

WITH date_bounds AS (
    SELECT
        MIN(Order_Month) AS First_Order_Month,
        MAX(Order_Month) AS Last_Order_Month
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
),

month_spine AS (
    SELECT Order_Month
    FROM date_bounds,
    UNNEST(
        GENERATE_DATE_ARRAY(
            First_Order_Month,
            Last_Order_Month,
            INTERVAL 1 MONTH
        )
    ) AS Order_Month
),

supplier_population AS (
    SELECT DISTINCT Supplier
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
),

supplier_month_spine AS (
    SELECT
        supplier.Supplier,
        month.Order_Month
    FROM supplier_population AS supplier
    CROSS JOIN month_spine AS month
),

monthly_aggregates AS (
    SELECT
        spine.Supplier,
        spine.Order_Month,

        COUNT(metrics.PO_ID) AS Order_Count,
        COALESCE(SUM(metrics.Negotiated_Value), 0) AS Negotiated_Spend,
        COALESCE(SUM(metrics.Gross_Value), 0) AS Gross_Value,
        COALESCE(SUM(metrics.Savings_Value), 0) AS Savings_Value,

        COUNTIF(metrics.Delivered) AS Delivered_Order_Count,
        COUNTIF(metrics.On_Time) AS On_Time_Order_Count,
        AVG(IF(metrics.Delivered, metrics.Lead_Days, NULL)) AS Avg_Lead_Days,

        COUNTIF(metrics.Defect_Eligible) AS Defect_Eligible_Order_Count,
        COALESCE(
            SUM(IF(metrics.Defect_Eligible, metrics.Quantity, NULL)),
            0
        ) AS Defect_Eligible_Units,
        COALESCE(
            SUM(IF(metrics.Defect_Eligible, metrics.Defective_Units, NULL)),
            0
        ) AS Defective_Units,

        COUNTIF(metrics.Compliance = 'Yes') AS Compliant_Order_Count

    FROM supplier_month_spine AS spine
    LEFT JOIN `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics` AS metrics
        ON metrics.Supplier = spine.Supplier
        AND metrics.Order_Month = spine.Order_Month
    GROUP BY
        spine.Supplier,
        spine.Order_Month
),

monthly_kpis AS (
    SELECT
        *,
        Savings_Value / NULLIF(Gross_Value, 0) AS Savings_Rate,
        CAST(On_Time_Order_Count AS FLOAT64)
            / NULLIF(Delivered_Order_Count, 0) AS On_Time_Rate,
        Defective_Units / NULLIF(Defect_Eligible_Units, 0) AS Defect_Rate,
        CAST(Compliant_Order_Count AS FLOAT64)
            / NULLIF(Order_Count, 0) AS Compliance_Rate
    FROM monthly_aggregates
),

period_comparisons AS (
    SELECT
        *,
        LAG(Order_Count) OVER supplier_months AS Prior_Month_Order_Count,
        LAG(Negotiated_Spend) OVER supplier_months AS Prior_Month_Negotiated_Spend,
        LAG(Savings_Rate) OVER supplier_months AS Prior_Month_Savings_Rate,
        LAG(On_Time_Rate) OVER supplier_months AS Prior_Month_On_Time_Rate
    FROM monthly_kpis
    WINDOW supplier_months AS (
        PARTITION BY Supplier
        ORDER BY Order_Month
    )
)

SELECT
    *,
    Order_Count - Prior_Month_Order_Count AS Order_Count_MoM_Change,
    Negotiated_Spend - Prior_Month_Negotiated_Spend AS Negotiated_Spend_MoM_Change,
    Savings_Rate - Prior_Month_Savings_Rate AS Savings_Rate_MoM_Change,
    On_Time_Rate - Prior_Month_On_Time_Rate AS On_Time_Rate_MoM_Change,

    SUM(Negotiated_Spend) OVER rolling_three_months
        AS Rolling_3_Month_Negotiated_Spend,
    CAST(SUM(On_Time_Order_Count) OVER rolling_three_months AS FLOAT64)
        / NULLIF(SUM(Delivered_Order_Count) OVER rolling_three_months, 0)
        AS Rolling_3_Month_On_Time_Rate,
    SUM(Defective_Units) OVER rolling_three_months
        / NULLIF(SUM(Defect_Eligible_Units) OVER rolling_three_months, 0)
        AS Rolling_3_Month_Defect_Rate

FROM period_comparisons
WINDOW rolling_three_months AS (
    PARTITION BY Supplier
    ORDER BY Order_Month
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
ORDER BY
    Supplier,
    Order_Month
