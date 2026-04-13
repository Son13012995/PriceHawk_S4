import db from "./database";

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Add to wishlist
    const { productId, userId = null } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    try {
      // Manual check to prevent duplicates if UNIQUE constraint is missing
      const existing = await db.query(
        "SELECT `id` FROM `wishlist` WHERE `product_id` = ? AND `user_id` <=> ?",
        [productId, userId]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: "Already in wishlist" });
      }

      await db.query(
        "INSERT INTO `wishlist` (`product_id`, `user_id`) VALUES (?, ?)",
        [productId, userId]
      );
      res.status(201).json({ message: "Added to wishlist" });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "GET") {
    // Get wishlist
    const { userId = null } = req.query;

    try {
      const result = await db.query(
        `SELECT 
          w.\`id\`, 
          w.\`product_id\`, 
          w.\`added_at\`,
          p.\`name\`,
          p.\`brand\`,
          p.\`image_url\`,
          p.\`current_price\`
        FROM \`wishlist\` w
        JOIN \`product\` p ON w.\`product_id\` = p.\`id\`
        WHERE w.\`user_id\` <=> ?
        ORDER BY w.\`added_at\` DESC`,
        [userId]
      );
      res.status(200).json({ data: result });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "DELETE") {
    // Remove from wishlist
    const { productId, userId = null } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    try {
      await db.query(
        "DELETE FROM `wishlist` WHERE `product_id` = ? AND `user_id` <=> ?",
        [productId, userId]
      );
      res.status(200).json({ message: "Removed from wishlist" });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
