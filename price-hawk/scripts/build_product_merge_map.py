import os
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pymysql


VARIANT_RE = re.compile(r"ram-([^_]+)_rom-([^_]+)_color-([^_]+)")


@dataclass
class ProductRow:
    product_id: int
    category_id: int
    model_key: Optional[str]
    variant_key: Optional[str]


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


def parse_variant_tokens(variant_key: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    if not variant_key:
        return None, None
    match = VARIANT_RE.search(variant_key)
    if not match:
        return None, None
    ram = match.group(1)
    rom = match.group(2)
    ram = None if not ram or ram == "na" else ram
    rom = None if not rom or rom == "na" else rom
    return ram, rom


def ensure_mapping_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS product_merge_map (
          source_product_id BIGINT PRIMARY KEY,
          canonical_product_id BIGINT NOT NULL,
          match_rule VARCHAR(64) NOT NULL,
          confidence DECIMAL(4,2) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_product_merge_map_canonical (canonical_product_id),
          CONSTRAINT fk_product_merge_map_source FOREIGN KEY (source_product_id) REFERENCES products(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_product_merge_map_canonical FOREIGN KEY (canonical_product_id) REFERENCES products(id)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def fetch_products(cur) -> List[ProductRow]:
    cur.execute("SELECT id, category_id, model_key, variant_key FROM products")
    return [ProductRow(int(r[0]), int(r[1]), r[2], r[3]) for r in cur.fetchall()]


def build_map(rows: List[ProductRow]) -> Dict[int, Tuple[int, str, float]]:
    mapping: Dict[int, Tuple[int, str, float]] = {}
    grouped: Dict[Tuple[int, str], List[ProductRow]] = defaultdict(list)

    for row in rows:
        if row.model_key:
            grouped[(row.category_id, row.model_key)].append(row)
        else:
            mapping[row.product_id] = (row.product_id, "no_model_key", 0.20)

    for _, items in grouped.items():
        # Stage 1: exact (ram, rom) signatures.
        exact_groups: Dict[Tuple[str, str], List[ProductRow]] = defaultdict(list)
        partial_groups: Dict[Tuple[Optional[str], Optional[str]], List[ProductRow]] = defaultdict(list)
        unknown_group: List[ProductRow] = []

        for item in items:
            ram, rom = parse_variant_tokens(item.variant_key)
            if ram and rom:
                exact_groups[(ram, rom)].append(item)
            elif ram or rom:
                partial_groups[(ram, rom)].append(item)
            else:
                unknown_group.append(item)

        exact_rep = {k: min(x.product_id for x in v) for k, v in exact_groups.items()}

        # Exact assignments.
        for key, group_rows in exact_groups.items():
            rep = exact_rep[key]
            for row in group_rows:
                mapping[row.product_id] = (rep, "model+exact_variant", 0.98)

        # Partial assignments with soft matching.
        partial_rep: Dict[Tuple[Optional[str], Optional[str]], int] = {}
        for key, group_rows in partial_groups.items():
            ram, rom = key
            candidate_exact = []
            for exact_key, rep in exact_rep.items():
                ex_ram, ex_rom = exact_key
                if (ram is None or ram == ex_ram) and (rom is None or rom == ex_rom):
                    candidate_exact.append(rep)

            if len(candidate_exact) == 1:
                rep = candidate_exact[0]
                rule = "model+partial_to_unique_exact"
                confidence = 0.90
            else:
                rep = min(x.product_id for x in group_rows)
                partial_rep[key] = rep
                rule = "model+partial_variant"
                confidence = 0.80

            for row in group_rows:
                mapping[row.product_id] = (rep, rule, confidence)

        # Unknown assignments.
        if unknown_group:
            if len(exact_rep) == 1:
                rep = next(iter(exact_rep.values()))
                rule = "model+unknown_to_single_exact"
                confidence = 0.82
            elif len(exact_rep) == 0 and len(partial_rep) == 1:
                rep = next(iter(partial_rep.values()))
                rule = "model+unknown_to_single_partial"
                confidence = 0.72
            else:
                rep = min(x.product_id for x in unknown_group)
                rule = "model_only"
                confidence = 0.60

            for row in unknown_group:
                mapping[row.product_id] = (rep, rule, confidence)

    return mapping


def write_map(cur, mapping: Dict[int, Tuple[int, str, float]]):
    sql = """
    INSERT INTO product_merge_map (source_product_id, canonical_product_id, match_rule, confidence)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
      canonical_product_id = VALUES(canonical_product_id),
      match_rule = VALUES(match_rule),
      confidence = VALUES(confidence)
    """
    for source_id, (canonical_id, rule, conf) in mapping.items():
        cur.execute(sql, (source_id, canonical_id, rule, conf))


def print_overlap_report(cur):
    # Aggregate on canonical product + platform using best latest price per platform.
    cur.execute(
        """
        WITH latest AS (
          SELECT pr.*
          FROM price_records pr
          JOIN (
            SELECT product_id, platform_id, MAX(crawled_at) AS max_crawled
            FROM price_records
            GROUP BY product_id, platform_id
          ) x
            ON pr.product_id = x.product_id
           AND pr.platform_id = x.platform_id
           AND pr.crawled_at = x.max_crawled
        ),
        mapped AS (
          SELECT
            COALESCE(pm.canonical_product_id, l.product_id) AS canonical_id,
            l.platform_id,
            l.price
          FROM latest l
          LEFT JOIN product_merge_map pm ON pm.source_product_id = l.product_id
        ),
        platform_best AS (
          SELECT canonical_id, platform_id, MIN(price) AS price
          FROM mapped
          GROUP BY canonical_id, platform_id
        )
        SELECT
          p.id,
          p.name,
          p.normalize_name,
          MIN(pb.price) AS min_price,
          MAX(pb.price) AS max_price,
          ROUND(MAX(pb.price) - MIN(pb.price), 2) AS spread,
          COUNT(*) AS platform_count
        FROM platform_best pb
        JOIN products p ON p.id = pb.canonical_id
        GROUP BY p.id, p.name, p.normalize_name
        HAVING COUNT(*) >= 2
        ORDER BY spread DESC
        LIMIT 15
        """
    )
    rows = cur.fetchall()

    print("Top spread across platforms after merge map:")
    if not rows:
        print("  (No overlap found)")
        return

    for row in rows:
        print(
            f"  canonical_id={row[0]} | spread={row[5]} | min={row[3]} | max={row[4]} | "
            f"platforms={row[6]} | name={row[1]}"
        )


def main():
    load_env_file()
    conn = get_mysql_conn()

    try:
        with conn.cursor() as cur:
            ensure_mapping_table(cur)
            products = fetch_products(cur)
            mapping = build_map(products)
            write_map(cur, mapping)
            conn.commit()

            cur.execute("SELECT COUNT(*) FROM product_merge_map")
            total = cur.fetchone()[0]
            print(f"product_merge_map rows: {total}")

            cur.execute(
                """
                SELECT match_rule, COUNT(*)
                FROM product_merge_map
                GROUP BY match_rule
                ORDER BY COUNT(*) DESC, match_rule ASC
                """
            )
            print("match_rule distribution:")
            for rule, cnt in cur.fetchall():
                print(f"  {rule}: {cnt}")

            print_overlap_report(cur)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
