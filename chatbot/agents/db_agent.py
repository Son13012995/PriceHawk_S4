"""
db_agent.py — Agent 2: Tìm kiếm sản phẩm trong MySQL database.

Hỗ trợ tất cả categories: điện thoại, laptop, tablet.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import db as database


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

        # Tìm trong DB
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
