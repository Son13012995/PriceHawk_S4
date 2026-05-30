import db from "./database";

/**
 * @swagger
 * /api/price-history:
 *   get:
 *     summary: Get price history for a specific product
 *     description: Fetch the 7-day price history, calculating minimum and maximum prices along with week-over-week trends.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the product.
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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing product ID" });

  try {
    // Lấy từng bản ghi 7 ngày qua từ DB thật, sau đó group ở JS
    const rawSql = `
      SELECT
        DATE(recorded_at) AS day,
        price,
        retailer
      FROM price_history
      WHERE product_id = ?
        AND recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY recorded_at DESC
    `;

    // Dữ liệu 14 ngày để tính % thay đổi so với tuần trước
    const weekChangeSql = `
      SELECT
        MIN(CASE WHEN recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)  THEN price ELSE NULL END) AS this_week_min,
        MIN(CASE WHEN recorded_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                  AND recorded_at <  DATE_SUB(NOW(), INTERVAL 7 DAY)  THEN price ELSE NULL END) AS last_week_min
      FROM price_history
      WHERE product_id = ?
        AND recorded_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `;

    const [rawRows, weekChangeRows] = await Promise.all([
      db.query(rawSql, [id]),
      db.query(weekChangeSql, [id]),
    ]);

    // Group by day ở phía JS — lấy min/max/avg giá mỗi ngày
    const dayMap = new Map();
    for (const row of rawRows) {
      // MySQL DATE() trả về JS Date object hoặc string — chuẩn hoá về YYYY-MM-DD
      let dayKey;
      if (row.day instanceof Date) {
        // Lấy theo local time để tránh UTC offset làm lệch ngày
        const d = row.day;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        dayKey = `${yyyy}-${mm}-${dd}`;
      } else {
        dayKey = String(row.day).slice(0, 10); // fallback nếu đã là string
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
        if (p < d.minPrice) {
          d.minPrice = p;
          d.bestRetailer = row.retailer; // retailer có giá thấp nhất trong ngày
        }
        if (p > d.maxPrice) d.maxPrice = p;
      }
    }

    // Sắp xếp DESC (ngày mới nhất trước)
    const history = Array.from(dayMap.values())
      .sort((a, b) => b.day.localeCompare(a.day))
      .map((d) => ({
        day: d.day,
        minPrice: d.minPrice,
        maxPrice: d.maxPrice,
        avgPrice: Math.round(d.totalPrice / d.count),
        bestRetailer: d.bestRetailer || null,
      }));

    // Tính % thay đổi giá so với tuần trước
    const weekData = weekChangeRows[0] || {};
    let weekChangePercent = null;
    let weekChangeTrend = "stable";
    if (weekData.this_week_min && weekData.last_week_min) {
      const change =
        ((weekData.this_week_min - weekData.last_week_min) /
          weekData.last_week_min) *
        100;
      weekChangePercent = Math.round(change * 10) / 10;
      if (change < -0.5) weekChangeTrend = "down";
      else if (change > 0.5) weekChangeTrend = "up";
      else weekChangeTrend = "stable";
    }

    const allMin = history.map((r) => r.minPrice).filter((p) => p > 0);
    const allMax = history.map((r) => r.maxPrice).filter((p) => p > 0);

    res.status(200).json({
      history,
      weekChangePercent,
      weekChangeTrend,
      minPrice: allMin.length ? Math.min(...allMin) : null,
      maxPrice: allMax.length ? Math.max(...allMax) : null,
    });
  } catch (error) {
    console.error("price-history DB error:", error);
    res.status(500).json({ error: "Internal Server Error", detail: error.message });
  }
}
