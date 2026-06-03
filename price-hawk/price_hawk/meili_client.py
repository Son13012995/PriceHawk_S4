"""
meili_client.py — MeiliSearch client helper for PriceHawk.

Provides functions to index products and search via MeiliSearch.
MySQL remains source of truth. MeiliSearch is search index only.
"""

import os
import httpx
from typing import List, Dict, Optional

MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_KEY = os.getenv("MEILI_MASTER_KEY", "pricehawk-meili-master-key-2026")
INDEX_NAME = "products"

HEADERS = {
    "Authorization": f"Bearer {MEILI_KEY}",
    "Content-Type": "application/json",
}


def _meili_url(path: str) -> str:
    return f"{MEILI_URL}{path}"


async def ensure_index():
    """Create index if not exists, configure searchable attributes."""
    async with httpx.AsyncClient() as client:
        # Create index (ignore if exists)
        await client.post(
            _meili_url("/indexes"),
            headers=HEADERS,
            json={"uid": INDEX_NAME, "primaryKey": "id"},
        )

        # Configure searchable attributes
        await client.patch(
            _meili_url(f"/indexes/{INDEX_NAME}/settings"),
            headers=HEADERS,
            json={
                "searchableAttributes": ["name", "brand", "identity_key"],
                "filterableAttributes": ["brand"],
                "sortableAttributes": ["current_price"],
                "typoTolerance": {
                    "enabled": True,
                    "minWordSizeForTypos": {
                        "oneTypo": 3,
                        "twoTypos": 5,
                    },
                },
            },
        )


async def index_products(products: List[Dict]):
    """
    Index products into MeiliSearch.
    
    Args:
        products: list of {"id": int, "name": str, "brand": str, "identity_key": str, "current_price": float}
    """
    if not products:
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _meili_url(f"/indexes/{INDEX_NAME}/documents"),
            headers=HEADERS,
            json=products,
        )
        if resp.status_code not in (200, 202):
            print(f"[MeiliSearch] Index error: {resp.status_code} {resp.text[:200]}")
        else:
            print(f"[MeiliSearch] Indexed {len(products)} products")


async def search_products(keyword: str, limit: int = 10) -> List[Dict]:
    """
    Search products in MeiliSearch.
    
    Returns list of product IDs with relevance score, or empty list if MeiliSearch unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                _meili_url(f"/indexes/{INDEX_NAME}/search"),
                headers=HEADERS,
                json={
                    "q": keyword,
                    "limit": limit,
                    "attributesToRetrieve": ["id", "name", "brand", "identity_key", "current_price"],
                },
            )
            if resp.status_code != 200:
                print(f"[MeiliSearch] Search error: {resp.status_code}")
                return []

            data = resp.json()
            hits = data.get("hits", [])
            print(f"[MeiliSearch] '{keyword}' → {len(hits)} hits (query time: {data.get('processingTimeMs', '?')}ms)")
            return hits

    except Exception as e:
        print(f"[MeiliSearch] Search failed (will fallback to MySQL): {e}")
        return []


def index_products_sync(products: List[Dict]):
    """Sync version for crawler (non-async context)."""
    if not products:
        return

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                _meili_url(f"/indexes/{INDEX_NAME}/documents"),
                headers=HEADERS,
                json=products,
            )
            if resp.status_code not in (200, 202):
                print(f"[MeiliSearch] Index error: {resp.status_code} {resp.text[:200]}")
            else:
                print(f"[MeiliSearch] Indexed {len(products)} products")
    except Exception as e:
        print(f"[MeiliSearch] Index failed (non-critical): {e}")


def ensure_index_sync():
    """Sync version for crawler setup."""
    try:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                _meili_url("/indexes"),
                headers=HEADERS,
                json={"uid": INDEX_NAME, "primaryKey": "id"},
            )
            client.patch(
                _meili_url(f"/indexes/{INDEX_NAME}/settings"),
                headers=HEADERS,
                json={
                    "searchableAttributes": ["name", "brand", "identity_key"],
                    "filterableAttributes": ["brand"],
                    "sortableAttributes": ["current_price"],
                    "typoTolerance": {
                        "enabled": True,
                        "minWordSizeForTypos": {
                            "oneTypo": 3,
                            "twoTypos": 5,
                        },
                    },
                },
            )
        print("[MeiliSearch] Index configured")
    except Exception as e:
        print(f"[MeiliSearch] Setup failed (non-critical): {e}")
