-- BigQuery / GoogleSQL adaptation of the validated DuckDB order metric layer.
-- Grain: one row per PO_ID.
-- Business rules mirror tools/procurement/build_case_data.py.

SELECT
    PO_ID,
    Supplier,
    Order_Date,
    Delivery_Date,
    Item_Category,
    Order_Status,
    Quantity,
    Unit_Price,
    Negotiated_Price,
    Defective_Units,
    Compliance,

    DATE_DIFF(Delivery_Date, Order_Date, DAY) AS Lead_Days,

    Unit_Price * Quantity AS Gross_Value,
    Negotiated_Price * Quantity AS Negotiated_Value,
    (Unit_Price - Negotiated_Price) * Quantity AS Savings_Value,

    Delivery_Date IS NOT NULL
        AND Delivery_Date < Order_Date
        AS Impossible_Delivery,

    Delivery_Date IS NOT NULL
        AND Delivery_Date >= Order_Date
        AS Delivered,

    Delivery_Date IS NOT NULL
        AND Delivery_Date >= Order_Date
        AND DATE_DIFF(Delivery_Date, Order_Date, DAY) <= 10
        AS On_Time,

    Defective_Units IS NOT NULL
        AS Defect_Eligible,

    Compliance = 'No'
        AS Noncompliant,

    DATE_TRUNC(Order_Date, MONTH)
        AS Order_Month,

    DATE_TRUNC(Order_Date, WEEK(SUNDAY))
        AS Order_Week_Start,

    CASE
        WHEN Delivery_Date IS NOT NULL AND Delivery_Date >= Order_Date
            THEN DATE_TRUNC(Delivery_Date, MONTH)
    END AS Delivery_Month,

    CASE
        WHEN Delivery_Date IS NOT NULL AND Delivery_Date >= Order_Date
            THEN DATE_TRUNC(Delivery_Date, WEEK(SUNDAY))
    END AS Delivery_Week_Start

FROM `{{ project_id }}.{{ dataset_id }}.procurement_orders`
ORDER BY PO_ID
