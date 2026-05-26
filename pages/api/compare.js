import db from "./database";

/**
 * @swagger
 * /api/compare:
 *   get:
 *     summary: Get price comparisons for a product
 *     description: Returns the product details and all competitor prices
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
        const productSql = `
            SELECT p.*,
                   (SELECT MIN(price) FROM comparison c WHERE c.product_id = p.id) AS min_price,
                   (SELECT COUNT(*) FROM comparison c WHERE c.product_id = p.id) AS retailer_count
            FROM product p WHERE p.id = ?
        `;
        // Sửa dòng dưới đây để sắp xếp giá từ thấp đến cao
        const comparisonSql = "SELECT * FROM comparison WHERE product_id = ? ORDER BY price ASC";

        const product = await db.query(productSql, [id]);
        const comparison = await db.query(comparisonSql, [id]);

        res.status(200).json({ product, comparison });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}