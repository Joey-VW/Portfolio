-- BigQuery / GoogleSQL adaptation of the supplier/category benchmarking mart.
-- Grain: one row per Supplier x Item_Category.
-- KPI ranks preserve exact ties and keep unavailable KPIs unranked.

WITH supplier_category_aggregates AS (
    SELECT
        Supplier,
        Item_Category,

        COUNT(*) AS Order_Count,

        SUM(Negotiated_Value) AS Negotiated_Spend,
        SUM(Gross_Value) AS Gross_Value,
        SUM(Savings_Value) AS Savings_Value,

        COUNTIF(Delivered) AS Delivered_Order_Count,
        COUNTIF(On_Time) AS On_Time_Order_Count,
        AVG(IF(Delivered, Lead_Days, NULL)) AS Avg_Lead_Days,

        COUNTIF(Defect_Eligible) AS Defect_Eligible_Order_Count,

        COALESCE(
            SUM(IF(Defect_Eligible, Quantity, NULL)),
            0
        ) AS Defect_Eligible_Units,

        COALESCE(
            SUM(IF(Defect_Eligible, Defective_Units, NULL)),
            0
        ) AS Defective_Units,

        COUNTIF(Compliance = 'Yes') AS Compliant_Order_Count

    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    GROUP BY
        Supplier,
        Item_Category
),

supplier_category_kpis AS (
    SELECT
        *,

        Savings_Value
            / NULLIF(Gross_Value, 0)
            AS Savings_Rate,

        CAST(On_Time_Order_Count AS FLOAT64)
            / NULLIF(Delivered_Order_Count, 0)
            AS On_Time_Rate,

        Defective_Units
            / NULLIF(Defect_Eligible_Units, 0)
            AS Defect_Rate,

        CAST(Compliant_Order_Count AS FLOAT64)
            / NULLIF(Order_Count, 0)
            AS Compliance_Rate

    FROM supplier_category_aggregates
),

category_baselines AS (
    SELECT
        Item_Category,

        COUNT(DISTINCT Supplier) AS Category_Supplier_Count,
        COUNT(*) AS Category_Order_Count,

        SUM(Negotiated_Value) AS Category_Negotiated_Spend,
        SUM(Gross_Value) AS Category_Gross_Value,
        SUM(Savings_Value) AS Category_Savings_Value,

        COUNTIF(Delivered) AS Category_Delivered_Order_Count,
        COUNTIF(On_Time) AS Category_On_Time_Order_Count,

        AVG(IF(Delivered, Lead_Days, NULL)) AS Category_Avg_Lead_Days,

        COUNTIF(Defect_Eligible) AS Category_Defect_Eligible_Order_Count,

        COALESCE(
            SUM(IF(Defect_Eligible, Quantity, NULL)),
            0
        ) AS Category_Defect_Eligible_Units,

        COALESCE(
            SUM(IF(Defect_Eligible, Defective_Units, NULL)),
            0
        ) AS Category_Defective_Units,

        COUNTIF(Compliance = 'Yes') AS Category_Compliant_Order_Count,

        SUM(Savings_Value)
            / NULLIF(SUM(Gross_Value), 0)
            AS Category_Savings_Rate,

        CAST(COUNTIF(On_Time) AS FLOAT64)
            / NULLIF(COUNTIF(Delivered), 0)
            AS Category_On_Time_Rate,

        COALESCE(
            SUM(IF(Defect_Eligible, Defective_Units, NULL)),
            0
        )
            / NULLIF(
                COALESCE(
                    SUM(IF(Defect_Eligible, Quantity, NULL)),
                    0
                ),
                0
            )
            AS Category_Defect_Rate,

        CAST(COUNTIF(Compliance = 'Yes') AS FLOAT64)
            / NULLIF(COUNT(*), 0)
            AS Category_Compliance_Rate

    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    GROUP BY Item_Category
),

ranked_supplier_categories AS (
    SELECT
        supplier.*,

        category.Category_Supplier_Count,
        category.Category_Order_Count,
        category.Category_Negotiated_Spend,
        category.Category_Gross_Value,
        category.Category_Savings_Value,
        category.Category_Savings_Rate,
        category.Category_Delivered_Order_Count,
        category.Category_On_Time_Order_Count,
        category.Category_Avg_Lead_Days,
        category.Category_On_Time_Rate,
        category.Category_Defect_Eligible_Order_Count,
        category.Category_Defect_Eligible_Units,
        category.Category_Defective_Units,
        category.Category_Defect_Rate,
        category.Category_Compliant_Order_Count,
        category.Category_Compliance_Rate,

        CASE WHEN supplier.Savings_Rate IS NOT NULL THEN
            RANK() OVER (
                PARTITION BY supplier.Item_Category
                ORDER BY supplier.Savings_Rate DESC NULLS LAST
            )
        END AS Savings_Rate_Category_Rank,

        CASE WHEN supplier.On_Time_Rate IS NOT NULL THEN
            RANK() OVER (
                PARTITION BY supplier.Item_Category
                ORDER BY supplier.On_Time_Rate DESC NULLS LAST
            )
        END AS On_Time_Rate_Category_Rank,

        CASE WHEN supplier.Defect_Rate IS NOT NULL THEN
            RANK() OVER (
                PARTITION BY supplier.Item_Category
                ORDER BY supplier.Defect_Rate ASC NULLS LAST
            )
        END AS Defect_Rate_Category_Rank,

        CASE WHEN supplier.Compliance_Rate IS NOT NULL THEN
            RANK() OVER (
                PARTITION BY supplier.Item_Category
                ORDER BY supplier.Compliance_Rate DESC NULLS LAST
            )
        END AS Compliance_Rate_Category_Rank

    FROM supplier_category_kpis AS supplier
    INNER JOIN category_baselines AS category
        ON supplier.Item_Category = category.Item_Category
)

SELECT
    Supplier,
    Item_Category,

    Order_Count,

    Negotiated_Spend,
    Gross_Value,
    Savings_Value,
    Savings_Rate,

    Delivered_Order_Count,
    On_Time_Order_Count,
    Avg_Lead_Days,
    On_Time_Rate,

    Defect_Eligible_Order_Count,
    Defect_Eligible_Units,
    Defective_Units,
    Defect_Rate,

    Compliant_Order_Count,
    Compliance_Rate,

    Category_Supplier_Count,
    Category_Order_Count,

    Category_Negotiated_Spend,
    Category_Gross_Value,
    Category_Savings_Value,
    Category_Savings_Rate,

    Savings_Rate
        - Category_Savings_Rate
        AS Savings_Rate_vs_Category,

    Category_Delivered_Order_Count,
    Category_On_Time_Order_Count,
    Category_Avg_Lead_Days,

    Avg_Lead_Days
        - Category_Avg_Lead_Days
        AS Avg_Lead_Days_vs_Category,

    Category_On_Time_Rate,

    On_Time_Rate
        - Category_On_Time_Rate
        AS On_Time_Rate_vs_Category,

    Category_Defect_Eligible_Order_Count,
    Category_Defect_Eligible_Units,
    Category_Defective_Units,
    Category_Defect_Rate,

    Defect_Rate
        - Category_Defect_Rate
        AS Defect_Rate_vs_Category,

    Category_Compliant_Order_Count,
    Category_Compliance_Rate,

    Compliance_Rate
        - Category_Compliance_Rate
        AS Compliance_Rate_vs_Category,

    Savings_Rate_Category_Rank,
    On_Time_Rate_Category_Rank,
    Defect_Rate_Category_Rank,
    Compliance_Rate_Category_Rank

FROM ranked_supplier_categories
ORDER BY
    Item_Category,
    Supplier
