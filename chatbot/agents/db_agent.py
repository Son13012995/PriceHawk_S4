"""
db_agent.py — Agent 2: Tìm kiếm sản phẩm trong MySQL database.

Hỗ trợ tất cả categories: điện thoại, laptop, tablet.
Flow: MeiliSearch (fast, fuzzy) → MySQL (fetch full data with prices).
Fallback: MySQL LIKE search nếu MeiliSearch unavailable.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import db as database
import meili_client


# Map từ các từ khóa của user sang category hints
CATEGORY_HINTS = {
    "dien-thoai": ["điện thoại", "phone", "iphone", "samsung", "xiaomi", "oppo",
                   "vivo", "realme", "honor", "nokia", "redmi", "galaxy s", "galaxy a"],
    "laptop": ["laptop", "máy tính xách tay", "macbook", "notebook", "dell", "hp",
               "asus", "acer", "lenovo", "msi", "surface", "thinkpad"],
    "tablet": ["tablet", "máy tính bảng", "ipad", "galaxy tab", "máy tính bảng"],
}


def detect_category_from_query(product_name: str, explicit_category: str | None) -> str | None:
    """Đoán category từ tên sản phẩm nếu chưa được chỉ định rõ."""
    if explicit_category:
        return explicit_category

    if not product_name:
        return None

    name_lower = product_name.lower()
    for category, keywords in CATEGORY_HINTS.items():
        for kw in keywords:
            if kw in name_lower:
                return category

    return None  # Không rõ category → search toàn bộ DB


class DBAgent:
    def __init__(self):
        self.db_available = database.is_db_available()
        if not self.db_available:
            print("[DBAgent] WARNING: Database not available. Will fallback to Internet Agent.")

    async def run(self, product_name: str | None, category: str | None = None) -> dict:
        """
        Tìm sản phẩm trong DB.
        Flow: MeiliSearch → MySQL fetch prices. Fallback: MySQL LIKE.

        Returns:
            {
                "found": bool,
                "products": list[dict],  # Grouped by product với prices list
                "search_keyword": str,
                "db_available": bool,
            }
        """
        if not product_name:
            return self._not_found(keyword="", db_available=self.db_available)

        if not self.db_available:
            return self._not_found(keyword=product_name, db_available=False)

        # Detect category để log
        detected_category = detect_category_from_query(product_name, category)
        print(f"[DBAgent] Searching: '{product_name}' | category hint: {detected_category}")

        # ── Step 1: Try MeiliSearch (fast, fuzzy) ──
        meili_hits = await meili_client.search_products(product_name, limit=10)
        if meili_hits:
            # Check ranking score — nếu top hit < 0.7 thì là fuzzy match, không phải exact
            top_score = meili_hits[0].get("_rankingScore", 0)
            if top_score < 0.95:
                print(f"[DBAgent] MeiliSearch low relevance (score={top_score:.3f}) → treating as partial")
                # Still use results but mark as partial
                product_ids = [h["id"] for h in meili_hits]
                rows = database.fetch_products_by_ids(product_ids)
                if rows:
                    grouped = database.group_by_product(rows)
                    print(f"[DBAgent] MeiliSearch partial → {len(grouped)} products")
                    return {
                        "found": True,
                        "products": grouped,
                        "search_keyword": product_name,
                        "match_type": "partial",
                        "db_available": True,
                    }
            else:
                # High relevance → exact match
                product_ids = [h["id"] for h in meili_hits]
                rows = database.fetch_products_by_ids(product_ids)
                if rows:
                    grouped = database.group_by_product(rows)
                    print(f"[DBAgent] MeiliSearch exact → {len(grouped)} products, {len(rows)} price entries")
                    return {
                        "found": True,
                        "products": grouped,
                        "search_keyword": product_name,
                        "match_type": "exact",
                        "db_available": True,
                    }

        # ── Step 2: Fallback MySQL LIKE search ──
        print(f"[DBAgent] MeiliSearch miss → fallback MySQL LIKE")
        rows, match_type = database.search_products(product_name, category=detected_category, limit=10)

        if not rows:
            print(f"[DBAgent] DB miss (no results) for '{product_name}'")
            return self._not_found(keyword=product_name, db_available=True)

        # Group rows theo product
        grouped = database.group_by_product(rows)
        print(f"[DBAgent] Found {len(grouped)} products (match_type={match_type}) with {len(rows)} price entries")

        return {
            "found": True,
            "products": grouped,
            "search_keyword": product_name,
            "match_type": match_type,   # "exact" | "partial"
            "db_available": True,
        }

    def _not_found(self, keyword: str, db_available: bool) -> dict:
        return {
            "found": False,
            "products": [],
            "search_keyword": keyword,
            "match_type": None,
            "db_available": db_available,
        }
