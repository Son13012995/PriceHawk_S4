import db from "./database";

/**
 * @swagger
 * /api/price-history:
 *   get:
 *     summary: Get price history for a specific product
 *     description: >
 *       Fetch price history grouped by day (7d/30d) or by week (90d/180d).
 *       Returns min/max prices and period-over-period trend.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the product.
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 180d]
 *           default: 7d
 *         description: Time range for price history.
 *     responses:
 *       200:
 *         description: A JSON object containing the price history and trends.
 *       400:
 *         description: Missing product ID.
 *       500:
 *         description: Internal Server Error.
 */
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { id, range = "7d" } = req.query;
  if (!id) return res.status(400).json({ error: "Missing product ID" });

  // Map range → số ngày
  const rangeDayMap = { "7d": 7, "30d": 30, "90d": 90, "180d": 180 };
  const days = rangeDayMap[range] ?? 7;

  // Với 90d/180d: group theo tuần để tránh quá nhiều điểm trên chart
  const groupByWeek = days >= 90;

  try {
    const rawSql = `
      SELECT
        DATE(recorded_at) AS day,
        YEARWEEK(recorded_at, 1) AS yearweek,
        DATE(DATE_SUB(recorded_at, INTERVAL WEEKDAY(recorded_at) DAY)) AS week_start,
        price,
        retailer
      FROM price_history
      WHERE product_id = ?
        AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY recorded_at DESC
    `;

    // So sánh nửa đầu vs nửa sau period để tính trend
    const periodChangeSql = `
      SELECT
        MIN(CASE WHEN recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN price ELSE NULL END) AS this_period_min,
        MIN(CASE WHEN recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                  AND recorded_at <  DATE_SUB(NOW(), INTERVAL ? DAY) THEN price ELSE NULL END) AS prev_period_min
      FROM price_history
      WHERE product_id = ?
        AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const [rawRows, periodChangeRows] = await Promise.all([
      db.query(rawSql, [id, days]),
      db.query(periodChangeSql, [id, Math.ceil(days / 2), days, Math.ceil(days / 2), id, days]),
    ]);

    let history;

    if (groupByWeek) {
      // Group by YEARWEEK
      const weekMap = new Map();
      for (const row of rawRows) {
        const weekKey = String(row.yearweek);
        // week_start có thể là Date object hoặc string
        let weekLabel;
        if (row.week_start instanceof Date) {
          const d = row.week_start;
          weekLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        } else {
          weekLabel = String(row.week_start).slice(0, 10);
        }

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            day: weekLabel,
            minPrice: Number(row.price),
            maxPrice: Number(row.price),
            totalPrice: Number(row.price),
            count: 1,
            bestRetailer: row.retailer,
          });
        } else {
          const d = weekMap.get(weekKey);
          const p = Number(row.price);
          d.totalPrice += p;
          d.count += 1;
          if (p < d.minPrice) { d.minPrice = p; d.bestRetailer = row.retailer; }
          if (p > d.maxPrice) d.maxPrice = p;
        }
      }

      history = Array.from(weekMap.values())
        .sort((a, b) => b.day.localeCompare(a.day))
        .map((d) => ({
          day: d.day,
          minPrice: d.minPrice,
          maxPrice: d.maxPrice,
          avgPrice: Math.round(d.totalPrice / d.count),
          bestRetailer: d.bestRetailer || null,
        }));
    } else {
      // Group by DATE (nguyên logic cũ)
      const dayMap = new Map();
      for (const row of rawRows) {
        let dayKey;
        if (row.day instanceof Date) {
          const d = row.day;
          dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        } else {
          dayKey = String(row.day).slice(0, 10);
        }

        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, {
            day: dayKey,
            minPrice: Number(row.price),
            maxPrice: Number(row.price),
            totalPrice: Number(row.price),
            count: 1,
            bestRetailer: row.retailer,
          });
        } else {
          const d = dayMap.get(dayKey);
          const p = Number(row.price);
          d.totalPrice += p;
          d.count += 1;
          if (p < d.minPrice) { d.minPrice = p; d.bestRetailer = row.retailer; }
          if (p > d.maxPrice) d.maxPrice = p;
        }
      }

      history = Array.from(dayMap.values())
        .sort((a, b) => b.day.localeCompare(a.day))
        .map((d) => ({
          day: d.day,
          minPrice: d.minPrice,
          maxPrice: d.maxPrice,
          avgPrice: Math.round(d.totalPrice / d.count),
          bestRetailer: d.bestRetailer || null,
        }));
    }

    // Tính % thay đổi giá so với nửa đầu period
    const periodData = periodChangeRows[0] || {};
    let periodChangePercent = null;
    let periodChangeTrend = "stable";
    if (periodData.this_period_min && periodData.prev_period_min) {
      const change =
        ((periodData.this_period_min - periodData.prev_period_min) /
          periodData.prev_period_min) *
        100;
      periodChangePercent = Math.round(change * 10) / 10;
      if (change < -0.5) periodChangeTrend = "down";
      else if (change > 0.5) periodChangeTrend = "up";
      else periodChangeTrend = "stable";
    }

    const allPrices = history.map((r) => r.minPrice).filter((p) => p > 0);

    res.status(200).json({
      history,
      range,
      groupBy: groupByWeek ? "week" : "day",
      // Giữ backward compat với tên cũ để không break các component khác
      weekChangePercent: periodChangePercent,
      weekChangeTrend: periodChangeTrend,
      periodChangePercent,
      periodChangeTrend,
      // minPrice / maxPrice đều lấy từ minPrice của từng kỳ — nhất quán với chart
      minPrice: allPrices.length ? Math.min(...allPrices) : null,
      maxPrice: allPrices.length ? Math.max(...allPrices) : null,
    });
  } catch (error) {
    console.error("price-history DB error:", error);
    res.status(500).json({ error: "Internal Server Error", detail: error.message });
  }
}
