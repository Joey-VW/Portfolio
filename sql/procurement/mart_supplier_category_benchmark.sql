-- Supplier/category benchmarking mart.
-- Grain: one row per Supplier x Item_Category.
--
-- Slice 3 adds category-relative KPI deltas.
-- Partitioned rankings follow only after these
-- deltas reconcile to the maintained Python layer.

WITH supplier_category_aggregates AS (
    SELECT
        Supplier,
        Item_Category,

        COUNT(*) AS Order_Count,

        SUM(Negotiated_Value) AS Negotiated_Spend,
        SUM(Gross_Value) AS Gross_Value,
        SUM(Savings_Value) AS Savings_Value,

        COUNT(*) FILTER (WHERE Delivered) AS Delivered_Order_Count,
        COUNT(*) FILTER (WHERE On_Time) AS On_Time_Order_Count,
        AVG(Lead_Days) FILTER (WHERE Delivered) AS Avg_Lead_Days,

        COUNT(*) FILTER (WHERE Defect_Eligible)
            AS Defect_Eligible_Order_Count,

        COALESCE(
            SUM(Quantity) FILTER (WHERE Defect_Eligible),
            0
        ) AS Defect_Eligible_Units,

        COALESCE(
            SUM(Defective_Units) FILTER (WHERE Defect_Eligible),
            0
        ) AS Defective_Units,

        COUNT(*) FILTER (WHERE Compliance = 'Yes')
            AS Compliant_Order_Count

    FROM int_procurement_order_metrics
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

        CAST(On_Time_Order_Count AS DOUBLE)
            / NULLIF(Delivered_Order_Count, 0)
            AS On_Time_Rate,

        Defective_Units
            / NULLIF(Defect_Eligible_Units, 0)
            AS Defect_Rate,

        CAST(Compliant_Order_Count AS DOUBLE)
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

        COUNT(*) FILTER (WHERE Delivered)
            AS Category_Delivered_Order_Count,

        COUNT(*) FILTER (WHERE On_Time)
            AS Category_On_Time_Order_Count,

        AVG(Lead_Days) FILTER (WHERE Delivered)
            AS Category_Avg_Lead_Days,

        COUNT(*) FILTER (WHERE Defect_Eligible)
            AS Category_Defect_Eligible_Order_Count,

        COALESCE(
            SUM(Quantity) FILTER (WHERE Defect_Eligible),
            0
        ) AS Category_Defect_Eligible_Units,

        COALESCE(
            SUM(Defective_Units) FILTER (WHERE Defect_Eligible),
            0
        ) AS Category_Defective_Units,

        COUNT(*) FILTER (WHERE Compliance = 'Yes')
            AS Category_Compliant_Order_Count,

        SUM(Savings_Value)
            / NULLIF(SUM(Gross_Value), 0)
            AS Category_Savings_Rate,

        CAST(COUNT(*) FILTER (WHERE On_Time) AS DOUBLE)
            / NULLIF(COUNT(*) FILTER (WHERE Delivered), 0)
            AS Category_On_Time_Rate,

        COALESCE(
            SUM(Defective_Units) FILTER (WHERE Defect_Eligible),
            0
        )
            / NULLIF(
                COALESCE(
                    SUM(Quantity) FILTER (WHERE Defect_Eligible),
                    0
                ),
                0
            )
            AS Category_Defect_Rate,

        CAST(
            COUNT(*) FILTER (WHERE Compliance = 'Yes')
            AS DOUBLE
        )
            / NULLIF(COUNT(*), 0)
            AS Category_Compliance_Rate

    FROM int_procurement_order_metrics
    GROUP BY Item_Category
)

SELECT
    supplier.Supplier,
    supplier.Item_Category,

    supplier.Order_Count,

    supplier.Negotiated_Spend,
    supplier.Gross_Value,
    supplier.Savings_Value,
    supplier.Savings_Rate,

    supplier.Delivered_Order_Count,
    supplier.On_Time_Order_Count,
    supplier.Avg_Lead_Days,
    supplier.On_Time_Rate,

    supplier.Defect_Eligible_Order_Count,
    supplier.Defect_Eligible_Units,
    supplier.Defective_Units,
    supplier.Defect_Rate,

    supplier.Compliant_Order_Count,
    supplier.Compliance_Rate,

    category.Category_Supplier_Count,
    category.Category_Order_Count,

    category.Category_Negotiated_Spend,
    category.Category_Gross_Value,
    category.Category_Savings_Value,
    category.Category_Savings_Rate,

    supplier.Savings_Rate
        - category.Category_Savings_Rate
        AS Savings_Rate_vs_Category,

    category.Category_Delivered_Order_Count,
    category.Category_On_Time_Order_Count,
    category.Category_Avg_Lead_Days,

    supplier.Avg_Lead_Days
        - category.Category_Avg_Lead_Days
        AS Avg_Lead_Days_vs_Category,

    category.Category_On_Time_Rate,

    supplier.On_Time_Rate
        - category.Category_On_Time_Rate
        AS On_Time_Rate_vs_Category,

    category.Category_Defect_Eligible_Order_Count,
    category.Category_Defect_Eligible_Units,
    category.Category_Defective_Units,
    category.Category_Defect_Rate,

    supplier.Defect_Rate
        - category.Category_Defect_Rate
        AS Defect_Rate_vs_Category,

    category.Category_Compliant_Order_Count,
    category.Category_Compliance_Rate,

    supplier.Compliance_Rate
        - category.Category_Compliance_Rate
        AS Compliance_Rate_vs_Category

FROM supplier_category_kpis AS supplier
INNER JOIN category_baselines AS category
    ON supplier.Item_Category = category.Item_Category

ORDER BY
    supplier.Item_Category,
    supplier.Supplier;