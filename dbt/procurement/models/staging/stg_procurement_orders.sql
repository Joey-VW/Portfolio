-- Thin typed staging layer over the locked external CSV source.
-- Grain: one row per PO_ID.

SELECT
    CAST(PO_ID AS VARCHAR) AS PO_ID,
    CAST(Supplier AS VARCHAR) AS Supplier,
    CAST(Order_Date AS DATE) AS Order_Date,
    CAST(Delivery_Date AS DATE) AS Delivery_Date,
    CAST(Item_Category AS VARCHAR) AS Item_Category,
    CAST(Order_Status AS VARCHAR) AS Order_Status,
    CAST(Quantity AS BIGINT) AS Quantity,
    CAST(Unit_Price AS DOUBLE) AS Unit_Price,
    CAST(Negotiated_Price AS DOUBLE) AS Negotiated_Price,
    CAST(Defective_Units AS DOUBLE) AS Defective_Units,
    CAST(Compliance AS VARCHAR) AS Compliance
FROM {{ source('procurement', 'procurement_orders') }}
