import db from "./database";

/**
 * @swagger
 * /api/product:
 *   get:
 *     summary: Get products or a single product
 *     description: Fetch a list of products or a single product by ID
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id, page = 1, pageSize = 10 } = req.query;

  try {
    let result;

    if (id) {
      // Fetch a single product by ID with pricing info
      result = await db.query(
        "SELECT p.*, (SELECT MIN(price) FROM comparison c WHERE c.product_id = p.id) AS min_price, (SELECT COUNT(*) FROM comparison c WHERE c.product_id = p.id) AS retailer_count FROM product p WHERE p.id = ?",
        [id]
      );
    } else {
      // Fetch total count
      const totalCountResult = await db.query("SELECT COUNT(*) AS total FROM product");
      const totalCount = totalCountResult[0].total;

      // Fetch paginated products with pricing info
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      result = await db.query(
        "SELECT p.*, (SELECT MIN(price) FROM comparison c WHERE c.product_id = p.id) AS min_price, (SELECT COUNT(*) FROM comparison c WHERE c.product_id = p.id) AS retailer_count FROM product p LIMIT ? OFFSET ?",
        [parseInt(pageSize), offset]
      );

      return res.status(200).json({ data: result, totalCount });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
