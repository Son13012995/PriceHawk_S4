import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Tuple

import pymysql


DATA_DIR = Path("data")
FILE_GLOB = "*_full.jsonl"


def load_env_file(path: Path = Path(".env")):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def get_mysql_conn():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "price_hawk"),
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.Cursor,
    )


def iter_rows(jsonl_path: Path) -> Iterable[dict]:
    with jsonl_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def parse_source_category(file_name: str) -> Tuple[str, str]:
    # Expected pattern: <source>_<category>_full.jsonl
    stem = file_name.removesuffix(".jsonl")
    if not stem.endswith("_full"):
        raise ValueError(f"Unexpected filename format: {file_name}")
    base = stem[:-5]
    source, category_slug = base.split("_", 1)
    return source, category_slug


def category_name_from_slug(slug: str) -> str:
    # Keep category labels human-readable while preserving slug as technical key.
    mapping = {
        "dien-thoai": "Dien thoai",
        "laptop": "Laptop",
        "tablet": "Tablet",
    }
    return mapping.get(slug, slug.replace("-", " ").title())


def parse_crawled_at(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)

    txt = value.strip()
    if txt.endswith("Z"):
        txt = txt[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(txt)
    except ValueError:
        return datetime.now(timezone.utc)

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def upsert_platform(cur, source: str) -> int:
    base_urls = {
        "fpt": "https://fptshop.com.vn",
        "tgdd": "https://www.thegioididong.com",
        "hoangha": "https://hoanghamobile.com",
    }
    base_url = base_urls.get(source)

    cur.execute(
        """
        INSERT INTO platforms (name, base_url)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          base_url = VALUES(base_url)
        """,
        (source, base_url),
    )
    return int(cur.lastrowid)


def upsert_category(cur, category_slug: str) -> int:
    category_name = category_name_from_slug(category_slug)

    cur.execute("SELECT id FROM categories WHERE slug = %s LIMIT 1", (category_slug,))
    row = cur.fetchone()
    if row:
        category_id = int(row[0])
        cur.execute(
            "UPDATE categories SET name = %s WHERE id = %s",
            (category_name, category_id),
        )
        return category_id

    cur.execute(
        """
        INSERT INTO categories (name, slug, parent_id)
        VALUES (%s, %s, NULL)
        """,
        (category_name, category_slug),
    )
    return int(cur.lastrowid)


def upsert_product(cur, category_id: int, row: dict) -> int:
    normalize_name = (row.get("normalize_name") or "").strip()
    if not normalize_name:
        raise ValueError("Row missing normalize_name; cannot upsert product")

    name = (row.get("name") or "").strip() or normalize_name
    brand = (row.get("brand_norm") or "").strip() or None
    model_key = (row.get("model_key") or "").strip() or None
    variant_key = (row.get("variant_key") or "").strip() or None
    image_url = (row.get("image_url") or "").strip() or None
    description = (row.get("description") or "").strip() or None

    cur.execute(
        """
        INSERT INTO products (
          category_id, name, normalize_name, brand, model_key, variant_key, image_url, description
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          name = VALUES(name),
          brand = VALUES(brand),
          model_key = VALUES(model_key),
          variant_key = VALUES(variant_key),
          image_url = VALUES(image_url),
          description = VALUES(description)
        """,
        (category_id, name, normalize_name, brand, model_key, variant_key, image_url, description),
    )
    return int(cur.lastrowid)


def insert_price_record(cur, product_id: int, platform_id: int, row: dict) -> bool:
    price = row.get("price")
    if price in (None, ""):
        return False

    try:
        price_num = float(price)
    except (TypeError, ValueError):
        return False

    url = (row.get("product_url") or "").strip() or None
    in_stock = 1 if bool(row.get("in_stock", True)) else 0
    crawled_at = parse_crawled_at(row.get("scraped_at"))

    cur.execute(
        """
        INSERT INTO price_records (product_id, platform_id, price, url, in_stock, crawled_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          price = VALUES(price),
          url = VALUES(url),
          in_stock = VALUES(in_stock)
        """,
        (product_id, platform_id, price_num, url, in_stock, crawled_at.replace(tzinfo=None)),
    )
    return True


def load_all_files(conn, data_dir: Path):
    files = sorted(data_dir.glob(FILE_GLOB))
    if not files:
        raise FileNotFoundError(f"No files found matching {data_dir / FILE_GLOB}")

    summary: Dict[str, Dict[str, int]] = {}

    with conn.cursor() as cur:
        for file_path in files:
            source, category_slug = parse_source_category(file_path.name)
            platform_id = upsert_platform(cur, source)
            category_id = upsert_category(cur, category_slug)

            product_count = 0
            price_count = 0
            skipped_no_price = 0
            skipped_no_name = 0

            for row in iter_rows(file_path):
                if not (row.get("normalize_name") or "").strip():
                    skipped_no_name += 1
                    continue

                product_id = upsert_product(cur, category_id, row)
                product_count += 1

                if insert_price_record(cur, product_id, platform_id, row):
                    price_count += 1
                else:
                    skipped_no_price += 1

            summary[file_path.name] = {
                "products_upserted": product_count,
                "price_records_upserted": price_count,
                "skipped_no_price": skipped_no_price,
                "skipped_no_normalize_name": skipped_no_name,
            }

    conn.commit()
    return summary


def main():
    load_env_file()
    conn = get_mysql_conn()
    try:
        summary = load_all_files(conn, DATA_DIR)
    finally:
        conn.close()

    print("Load completed.")
    for file_name, stats in summary.items():
        print(f"[{file_name}]")
        for k, v in stats.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
