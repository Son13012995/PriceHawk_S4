/**
 * pages/api/extension/save.js
 *
 * POST /api/extension/save
 * Body: { name, price, sourceUrl, brand?, category? }
 *
 * Server normalizes → duplicate check → insert if new
 */

import db from "@/pages/api/database";
import { normalizeIdentityByCategory } from "@/lib/normalizer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, price, sourceUrl, brand = null, category = null } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return res.status(400).json({ error: "sourceUrl is required" });
  }

  // ── 1. Normalize ──────────────────────────────────────────────────────────
  const normalized = normalizeIdentityByCategory(name.trim(), brand, category);
  const identityKey = normalized.normalizeName;

  if (!identityKey) {
    return res.status(422).json({ error: "Could not normalize product name" });
  }

  // ── 2. Duplicate check ────────────────────────────────────────────────────
  const existing = await db.query(
    "SELECT id FROM product WHERE identity_key = ? LIMIT 1",
    [identityKey]
  );

  if (existing?.length > 0) {
    return res.status(200).json({
      duplicate: true,
      productId: existing[0].id,
      identityKey,
    });
  }

  // ── 3. Insert ─────────────────────────────────────────────────────────────
  const currentPrice = typeof price === "number" ? price : parseFloat(price) || null;

  const result = await db.query(
    `INSERT INTO product (name, current_price, brand, identity_key)
     VALUES (?, ?, ?, ?)`,
    [name.trim(), currentPrice, normalized.brandNorm ?? null, identityKey]
  );

  const productId = result.insertId;

  // Also save to comparison table (tracks source URL + price)
  if (productId && sourceUrl) {
    await db.query(
      `INSERT INTO comparison (product_id, price, url, name, current_price_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE price = VALUES(price), current_price_at = NOW()`,
      [productId, currentPrice ?? 0, sourceUrl, name.trim()]
    ).catch(() => {}); // non-fatal
  }

  return res.status(200).json({
    success: true,
    productId,
    identityKey,
    normalizedResult: normalized,
  });
}