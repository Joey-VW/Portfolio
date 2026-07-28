-- BigQuery reference implementation of the maintained supplier metric layer.
-- Browser results are generated locally by tools/procurement/build_case_data.py.
SELECT
  Supplier,
  COUNT(*) AS orders,
  SUM(Negotiated_Price * Quantity) AS spend,
  SAFE_DIVIDE(
    SUM((Unit_Price - Negotiated_Price) * Quantity),
    SUM(Unit_Price * Quantity)
  ) AS negotiation_savings_rate,
  AVG(DATE_DIFF(Delivery_Date, Order_Date, DAY)) AS average_lead_days,
  SAFE_DIVIDE(
    COUNTIF(Delivery_Date IS NOT NULL
      AND DATE_DIFF(Delivery_Date, Order_Date, DAY) <= 10),
    COUNTIF(Delivery_Date IS NOT NULL)
  ) AS on_time_delivery_rate,
  SAFE_DIVIDE(
    SUM(IF(Defective_Units IS NOT NULL, Defective_Units, 0)),
    SUM(IF(Defective_Units IS NOT NULL, Quantity, 0))
  ) AS defect_rate,
  SAFE_DIVIDE(COUNTIF(Compliance = 'Yes'), COUNT(*)) AS compliance_rate
FROM `your-project.your_dataset.procurement_orders`
GROUP BY Supplier
ORDER BY Supplier;
