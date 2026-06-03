"""
index_existing.py — Index all existing MySQL products into MeiliSearch.
Run once after MeiliSearch is up to backfill the search index.
"""

import pymysql
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_KEY = os.getenv("MEILI_MASTER_KEY", "pricehawk-meili-master-key-2026")
INDEX_NAME = "products"

HEADERS = {
    "Authorization": f"Bearer {MEILI_KEY}",
    "Content-Type": "application/json",
}


def get_mysql_connection():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3307")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "rootpassword"),
        database=os.getenv("MYSQL_DB", "pricecomparison"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def main():
    # 1. Configure MeiliSearch index
    print("[MeiliSearch] Configuring index...")
    with httpx.Client(timeout=10.0) as client:
        client.post(
            f"{MEILI_URL}/indexes",
            headers=HEADERS,
            json={"uid": INDEX_NAME, "primaryKey": "id"},
        )
        client.patch(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/settings",
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

    # 2. Fetch all products from MySQL
    print("[MySQL] Fetching products...")
    conn = get_mysql_connection()
    with conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, brand, identity_key, current_price FROM product")
            products = cursor.fetchall()

    print(f"[MySQL] Found {len(products)} products")

    if not products:
        print("No products to index.")
        return

    # 3. Index into MeiliSearch (batch 1000)
    BATCH_SIZE = 1000
    total_indexed = 0
    with httpx.Client(timeout=30.0) as client:
        for i in range(0, len(products), BATCH_SIZE):
            batch = products[i:i + BATCH_SIZE]
            # Convert Decimal to float for JSON serialization
            for p in batch:
                if p.get("current_price"):
                    p["current_price"] = float(p["current_price"])

            resp = client.post(
                f"{MEILI_URL}/indexes/{INDEX_NAME}/documents",
                headers=HEADERS,
                json=batch,
            )
            if resp.status_code in (200, 202):
                total_indexed += len(batch)
                print(f"  Indexed batch {i // BATCH_SIZE + 1}: {len(batch)} products")
            else:
                print(f"  Error: {resp.status_code} {resp.text[:200]}")

    print(f"\n[Done] Indexed {total_indexed} products into MeiliSearch")


if __name__ == "__main__":
    main()
