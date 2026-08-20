-- BigQuery / GoogleSQL adaptation of the procurement quality-exceptions mart.
-- Grain: one row per affected PO_ID x exception classification.

WITH exception_rows AS (
    SELECT
        PO_ID,
        Supplier,
        Item_Category,
        Order_Status,
        Order_Date,
        Delivery_Date,
        'missing_delivery_date' AS Exception_Code,
        'Delivery date is absent.' AS Exception_Description,
        'lead time; on-time delivery' AS Affected_Metrics,
        'Excluded from delivery and on-time denominators; retained elsewhere.'
            AS Metric_Treatment
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Delivery_Date IS NULL

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'impossible_delivery_chronology',
        'Delivery date precedes order date.',
        'lead time; on-time delivery; delivery period analysis',
        'Excluded from delivery, on-time, and delivery-period denominators; retained elsewhere.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Impossible_Delivery

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'missing_defect_observation',
        'Defective-units observation is absent.',
        'defect rate',
        'Excluded from defect-rate numerator and denominator; retained elsewhere.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE NOT Defect_Eligible

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'pending_order_status',
        'Source Order_Status is Pending.',
        'status interpretation',
        'No status-only exclusion is applied; inspect alongside observed delivery state.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Order_Status = 'Pending'

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'cancelled_order_status',
        'Source Order_Status is Cancelled.',
        'status interpretation',
        'No status-only exclusion is applied; inspect alongside observed delivery state.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Order_Status = 'Cancelled'

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'completion_status_missing_delivery',
        'Completion-oriented status has no delivery date.',
        'status interpretation; lead time; on-time delivery',
        'Excluded from delivery and on-time denominators because delivery evidence is absent.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Order_Status IN ('Delivered', 'Partially Delivered')
        AND Delivery_Date IS NULL

    UNION ALL

    SELECT
        PO_ID, Supplier, Item_Category, Order_Status, Order_Date, Delivery_Date,
        'noncompletion_status_with_delivery',
        'Pending or cancelled status has a valid delivery date.',
        'status interpretation',
        'Included in delivery metrics based on valid observed delivery, not status alone.'
    FROM `{{ project_id }}.{{ dataset_id }}.int_procurement_order_metrics`
    WHERE Order_Status IN ('Pending', 'Cancelled')
        AND Delivered
)

SELECT *
FROM exception_rows
ORDER BY PO_ID, Exception_Code
