import db from "./database";

const MEILI_URL = process.env.MEILI_URL || "http://localhost:7700";
const MEILI_KEY = process.env.MEILI_MASTER_KEY || "pricehawk-meili-master-key-2026";

/**
 * @swagger
 * /api/pagination:
 *   get:
 *     summary: Search products with pagination
 *     description: Search for products by name (MeiliSearch first, MySQL fallback)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
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
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { q, page, pageSize } = req.query;
  if (!q) return res.status(400).json({ error: "Missing search term" });

  const pageNumber = parseInt(page) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (pageNumber - 1) * limit;

  try {
    // ── Step 1: Try MeiliSearch ──
    const meiliResults = await searchMeili(q, limit, offset);
    if (meiliResults) {
      return res.status(200).json(meiliResults);
    }

    // ── Step 2: Fallback MySQL LIKE ──
    const countQuery = "SELECT COUNT(*) AS count FROM product WHERE name LIKE ?";
    const searchQuery = "SELECT * FROM product WHERE name LIKE ? LIMIT ? OFFSET ?";

    const totalResults = await db.query(countQuery, [`%${q}%`]);
    const searchResults = await db.query(searchQuery, [`%${q}%`, limit, offset]);

    res.status(200).json({
      totalCount: totalResults[0].count,
      page: pageNumber,
      pageSize: limit,
      totalPages: Math.ceil(totalResults[0].count / limit),
      data: searchResults,
      searchEngine: "mysql",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function searchMeili(keyword, limit, offset) {
  try {
    const resp = await fetch(`${MEILI_URL}/indexes/products/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MEILI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        limit: limit + offset,
        attributesToRetrieve: ["id", "name", "brand", "identity_key", "current_price"],
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const hits = data.hits || [];
    const totalCount = data.estimatedTotalHits || hits.length;
    const pagedHits = hits.slice(offset, offset + limit);

    if (pagedHits.length === 0) return null;

    return {
      totalCount,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit),
      data: pagedHits,
      searchEngine: "meilisearch",
      queryTimeMs: data.processingTimeMs,
    };
  } catch (e) {
    console.log("[MeiliSearch] Unavailable, fallback to MySQL:", e.message);
    return null;
  }
}
