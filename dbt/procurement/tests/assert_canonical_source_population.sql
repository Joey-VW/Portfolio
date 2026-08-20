-- Fail if dbt is not reading the locked canonical source population.
WITH population AS (
    SELECT
        COUNT(*) AS row_count,
        COUNT(DISTINCT PO_ID) AS unique_po_ids,
        COUNT(DISTINCT Supplier) AS supplier_count,
        COUNT(DISTINCT Item_Category) AS category_count
    FROM {{ source('procurement', 'procurement_orders') }}
)
SELECT *
FROM population
WHERE row_count <> 777
   OR unique_po_ids <> 777
   OR supplier_count <> 5
   OR category_count <> 5
