/**
 * pages/api/extension/compare.js
 *
 * POST /api/extension/compare
 * Body: { name, price, sourceUrl, brand?, category? }
 *
 * Server normalizes → queries identity_key → returns match + priceDiff
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

  // ── 1. Normalize ──────────────────────────────────────────────────────────
  const normalized = normalizeIdentityByCategory(name.trim(), brand, category);
  const identityKey = normalized.normalizeName;

  if (!identityKey) {
    return res.status(422).json({
      found: false,
      error: "Could not normalize product name",
      normalizedResult: normalized,
    });
  }

  // ── 2. Query DB ───────────────────────────────────────────────────────────
  const rows = await db.query(
    `SELECT id, name, current_price, brand, image_url, identity_key
     FROM product
     WHERE identity_key = ?
     LIMIT 1`,
    [identityKey]
  );

  const matched = rows?.[0] ?? null;

  // ── 3. Build response ─────────────────────────────────────────────────────
  if (!matched) {
    return res.status(200).json({
      found: false,
      identityKey,
      normalizedResult: normalized,
    });
  }

  const currentPrice = typeof price === "number" ? price : parseFloat(price) || null;
  const dbPrice = matched.current_price ?? null;
  const priceDiff = currentPrice !== null && dbPrice !== null
    ? Math.round(currentPrice - dbPrice)
    : null;

  return res.status(200).json({
    found: true,
    identityKey,
    normalizedResult: normalized,
    matchedProduct: {
      id: matched.id,
      name: matched.name,
      brand: matched.brand,
      imageUrl: matched.image_url,
      price: dbPrice,
    },
    currentPrice,
    priceDiff,
  });
}