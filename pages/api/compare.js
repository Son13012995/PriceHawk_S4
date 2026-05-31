import db from "./database";

/**
 * @swagger
 * /api/compare:
 *   get:
 *     summary: Get price comparisons for a product
 *     description: |
 *       Trả về thông tin sản phẩm và danh sách giá theo từng nhà bán lẻ.
 *       Giá so sánh ưu tiên lấy từ price_history (bản ghi mới nhất mỗi retailer).
 *       Fallback về bảng comparison nếu price_history chưa có dữ liệu.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing product ID" });

    try {
        // Thông tin sản phẩm + giá thấp nhất hiện tại
        const productSql = `
            SELECT p.*,
                   COALESCE(
                     (SELECT MIN(ph.price)
                      FROM price_history ph
                      WHERE ph.product_id = p.id
                        AND ph.recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)),
                     (SELECT MIN(c.price) FROM comparison c WHERE c.product_id = p.id)
                   ) AS min_price,
                   (SELECT COUNT(DISTINCT COALESCE(ph.retailer, c.name))
                    FROM comparison c
                    LEFT JOIN price_history ph
                      ON ph.comparison_id = c.id
                    WHERE c.product_id = p.id) AS retailer_count
            FROM product p
            WHERE p.id = ?
        `;

        // Bảng so sánh giá: lấy giá mới nhất của từng retailer từ price_history,
        // join với comparison để lấy URL mua hàng.
        // Nếu retailer chưa có trong price_history, fallback về comparison.
        const comparisonFromHistorySql = `
            SELECT
                c.id,
                c.product_id,
                c.url,
                COALESCE(ph_latest.retailer, c.name) AS name,
                COALESCE(ph_latest.price, c.price) AS price,
                COALESCE(ph_latest.recorded_at, c.current_price_at) AS current_price_at
            FROM comparison c
            LEFT JOIN (
                SELECT
                    comparison_id,
                    retailer,
                    price,
                    recorded_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY comparison_id
                        ORDER BY recorded_at DESC
                    ) AS rn
                FROM price_history
                WHERE product_id = ?
            ) ph_latest ON ph_latest.comparison_id = c.id AND ph_latest.rn = 1
            WHERE c.product_id = ?
            ORDER BY price ASC
        `;

        // Fallback: lấy thẳng từ comparison nếu price_history chưa có dữ liệu
        const comparisonFallbackSql = `
            SELECT * FROM comparison WHERE product_id = ? ORDER BY price ASC
        `;

        // Thời điểm cào gần nhất: MAX(current_price_at) vì crawler luôn cập nhật
        // field này mỗi lần chạy, kể cả khi giá không đổi
        const lastCrawledSql = `
            SELECT MAX(current_price_at) AS lastCrawledAt
            FROM comparison
            WHERE product_id = ?
        `;

        // Gi\u00e1 cao nh\u1ea5t t\u1eeb tr\u01b0\u1edbc t\u1edbi nay (all-time high) t\u1eeb price_history
        const allTimeMaxSql = `
            SELECT MAX(price) AS allTimeMax
            FROM price_history
            WHERE product_id = ?
        `;

        const [product, historyRows, lastCrawledRows, allTimeMaxRows] = await Promise.all([
            db.query(productSql, [id]),
            db.query(comparisonFromHistorySql, [id, id]),
            db.query(lastCrawledSql, [id]),
            db.query(allTimeMaxSql, [id]),
        ]);

        let comparison;
        if (historyRows && historyRows.length > 0) {
            comparison = historyRows;
        } else {
            // Chưa có dữ liệu price_history → dùng comparison gốc
            comparison = await db.query(comparisonFallbackSql, [id]);
        }

        const lastCrawledAt = lastCrawledRows?.[0]?.lastCrawledAt ?? null;
        const allTimeMax = allTimeMaxRows?.[0]?.allTimeMax
            ? Number(allTimeMaxRows[0].allTimeMax)
            : null;

        res.status(200).json({ product, comparison, lastCrawledAt, allTimeMax });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}