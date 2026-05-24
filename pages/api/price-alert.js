import db from "./database";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Check all active price alerts and trigger them if current_price <= target_price
 */
async function checkAndTriggerPriceAlerts() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting price alert check...`);

  try {
    // Get all active alerts with current product prices
    const activeAlerts = await db.query(
      `SELECT 
        pa.\`id\`,
        pa.\`product_id\`,
        pa.\`target_price\`,
        pa.\`current_price\` as alert_created_price,
        p.\`current_price\` as latest_price,
        p.\`name\`,
        p.\`brand\`
      FROM \`price_alert\` pa
      JOIN \`product\` p ON pa.\`product_id\` = p.\`id\`
      WHERE pa.\`status\` = 'active'`
    );

    if (!activeAlerts || activeAlerts.length === 0) {
      console.log(`[${timestamp}] No active alerts found.`);
      return {
        success: true,
        triggered: 0,
        checked: 0,
        details: []
      };
    }

    console.log(`[${timestamp}] Found ${activeAlerts.length} active alerts. Checking...`);

    const triggeredAlerts = [];
    const checkDetails = [];

    // Check each alert and trigger if necessary
    for (const alert of activeAlerts) {
      const { id, product_id, target_price, latest_price, name, brand } = alert;
      
      const detail = {
        alertId: id,
        productId: product_id,
        productName: name,
        brand,
        targetPrice: target_price,
        currentPrice: latest_price,
        triggered: false
      };

      // Check if current price is at or below target price
      if (latest_price <= target_price) {
        try {
          // Update alert status to triggered
          await db.query(
            `UPDATE \`price_alert\` 
            SET \`status\` = 'triggered', \`triggered_at\` = NOW() 
            WHERE \`id\` = ?`,
            [id]
          );

          detail.triggered = true;
          triggeredAlerts.push(id);

          console.log(
            `[${timestamp}] ✓ Alert #${id} TRIGGERED: ${name} (${brand}) - Price: ${latest_price} <= Target: ${target_price}`
          );
        } catch (updateError) {
          console.error(`[${timestamp}] ✗ Error triggering alert #${id}:`, updateError);
          detail.error = updateError.message;
        }
      } else {
        console.log(
          `[${timestamp}] ○ Alert #${id} waiting: ${name} - Price: ${latest_price} > Target: ${target_price}`
        );
      }

      checkDetails.push(detail);
    }

    const result = {
      success: true,
      checked: activeAlerts.length,
      triggered: triggeredAlerts.length,
      triggeredIds: triggeredAlerts,
      details: checkDetails,
      timestamp
    };

    console.log(`[${timestamp}] Check completed. Triggered: ${triggeredAlerts.length}/${activeAlerts.length}`);
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in checkAndTriggerPriceAlerts:`, error);
    return {
      success: false,
      error: error.message,
      triggered: 0,
      checked: 0,
      details: []
    };
  }
}

export default async function handler(req, res) {
  // Handle cron check trigger
  const { action } = req.query;
  
  if (action === "check-triggers" && req.method === "GET") {
    try {
      console.log("📡 Manual trigger of price alert check via API");
      const result = await checkAndTriggerPriceAlerts();
      return res.status(200).json(result);
    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id ? Number(session.user.id) : null;
  if (action !== "check-triggers") {
    console.log(`[PRICE_ALERT] ${req.method} — userId=${userId}`);
  }

  if (req.method === "POST") {
    // Create price alert
    const { productId, targetPrice, note = null } = req.body;

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
    const { status = "active" } = req.query;

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
