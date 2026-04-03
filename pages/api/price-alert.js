import db from "./database";

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Create price alert
    const { productId, targetPrice, note = null, userId = null } = req.body;

    if (!productId || targetPrice === undefined) {
      return res.status(400).json({ error: "productId and targetPrice are required" });
    }

    try {
      // Get current price from product table
      const productResult = await db.query(
        "SELECT `current_price` FROM `product` WHERE `id` = ?",
        [productId]
      );

      if (!productResult || productResult.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const currentPrice = productResult[0].current_price;

      // Validate target price is lower than current price
      if (targetPrice >= currentPrice) {
        return res
          .status(400)
          .json({
            error: `Target price must be lower than current price (£${currentPrice})`,
          });
      }

      // Insert into price_alert table
      await db.query(
        `INSERT INTO \`price_alert\` (\`product_id\`, \`user_id\`, \`target_price\`, \`current_price\`, \`note\`, \`status\`) 
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [productId, userId, targetPrice, currentPrice, note]
      );

      res.status(201).json({ message: "Price alert created successfully" });
    } catch (error) {
      console.error("Database error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Price alert already exists for this product" });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "GET") {
    // Get price alerts
    const { userId = null, status = "active" } = req.query;

    try {
      let query = `SELECT 
        pa.\`id\`,
        pa.\`product_id\`,
        pa.\`target_price\`,
        pa.\`current_price\`,
        pa.\`note\`,
        pa.\`status\`,
        pa.\`created_at\`,
        pa.\`triggered_at\`,
        p.\`name\`,
        p.\`brand\`,
        p.\`image_url\`,
        p.\`current_price\` as latest_price
      FROM \`price_alert\` pa
      JOIN \`product\` p ON pa.\`product_id\` = p.\`id\`
      WHERE pa.\`user_id\` IS NULL OR pa.\`user_id\` = ?`;

      const params = [userId];

      if (status && status !== "all") {
        query += ` AND pa.\`status\` = ?`;
        params.push(status);
      }

      query += ` ORDER BY pa.\`created_at\` DESC`;

      const result = await db.query(query, params);
      res.status(200).json({ data: result });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "PUT") {
    // Update price alert status
    const { alertId, status } = req.body;

    if (!alertId || !status) {
      return res.status(400).json({ error: "alertId and status are required" });
    }

    try {
      await db.query("UPDATE `price_alert` SET `status` = ? WHERE `id` = ?", [
        status,
        alertId,
      ]);
      res.status(200).json({ message: "Alert status updated" });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "DELETE") {
    // Delete price alert
    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({ error: "alertId is required" });
    }

    try {
      await db.query("DELETE FROM `price_alert` WHERE `id` = ?", [alertId]);
      res.status(200).json({ message: "Price alert deleted" });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
