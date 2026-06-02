"""
meili_client.py — MeiliSearch client for chatbot (async).
"""

import os
import httpx

MEILI_URL = os.getenv("MEILI_URL", "http://meilisearch:7700")
MEILI_KEY = os.getenv("MEILI_MASTER_KEY", "pricehawk-meili-master-key-2026")
INDEX_NAME = "products"

HEADERS = {
    "Authorization": f"Bearer {MEILI_KEY}",
    "Content-Type": "application/json",
}


async def search_products(keyword: str, limit: int = 10) -> list[dict]:
    """
    Search products in MeiliSearch. Returns list of hits or empty list on failure.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
                headers=HEADERS,
                json={
                    "q": keyword,
                    "limit": limit,
                    "attributesToRetrieve": ["id", "name", "brand", "identity_key", "current_price"],
                },
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            hits = data.get("hits", [])
            print(f"[MeiliSearch] '{keyword}' → {len(hits)} hits ({data.get('processingTimeMs', '?')}ms)")
            return hits

    except Exception as e:
        print(f"[MeiliSearch] Search failed (fallback to MySQL): {e}")
        return []
