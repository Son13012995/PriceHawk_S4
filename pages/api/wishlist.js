import db from "./database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id ? Number(session.user.id) : null;
  console.log(`[WISHLIST] ${req.method} — userId=${userId}`);

  if (req.method === "POST") {
    // Add to wishlist
    const { productId } = req.body;

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
    const { productId } = req.body;

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
