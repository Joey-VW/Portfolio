-- Foundational order-level metric layer.
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

    date_diff('day', Order_Date, Delivery_Date) AS Lead_Days,

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
        AND date_diff('day', Order_Date, Delivery_Date) <= 10
        AS On_Time,

    Defective_Units IS NOT NULL
        AS Defect_Eligible,

    Compliance = 'No'
        AS Noncompliant

FROM procurement_orders
ORDER BY PO_ID;
