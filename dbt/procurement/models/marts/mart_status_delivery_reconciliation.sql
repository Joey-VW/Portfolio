-- Status and delivery reconciliation.
-- Grain: one row per PO_ID.

SELECT
    PO_ID,
    Supplier,
    Item_Category,
    Order_Status,
    Order_Date,
    Delivery_Date,
    Impossible_Delivery,
    Delivered,
    On_Time,
    CASE
        WHEN Impossible_Delivery THEN 'impossible_delivery_chronology'
        WHEN Delivery_Date IS NULL THEN 'missing_delivery_date'
        ELSE 'valid_delivery_date'
    END AS Observed_Delivery_State,
    CASE
        WHEN Impossible_Delivery THEN 'impossible_delivery_chronology'
        WHEN Order_Status IN ('Delivered', 'Partially Delivered')
            AND Delivered THEN 'completion_status_with_valid_delivery'
        WHEN Order_Status IN ('Delivered', 'Partially Delivered')
            THEN 'completion_status_missing_delivery'
        WHEN Order_Status IN ('Pending', 'Cancelled')
            AND Delivered THEN 'noncompletion_status_with_valid_delivery'
        ELSE 'noncompletion_status_missing_delivery'
    END AS Reconciliation_Classification
FROM {{ ref('int_procurement_order_metrics') }}
ORDER BY PO_ID
