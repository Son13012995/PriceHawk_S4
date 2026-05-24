"""
db.py — Kết nối MySQL và cung cấp hàm search sản phẩm.

Dùng chung database với Next.js app (cùng .env config).
Docker MySQL expose port 3307 ra host.
"""

import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv
from dbutils.pooled_db import PooledDB

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3307")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "rootpassword"),
    "db": os.getenv("DB_NAME", "pricecomparison"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

_pool: PooledDB | None = None

def get_pool() -> PooledDB:
    global _pool
    if _pool is None:
        _pool = PooledDB(
            creator=pymysql,
            maxconnections=10,
            mincached=2,
            **DB_CONFIG,
        )
    return _pool


def get_connection():
    """Lấy kết nối MySQL từ pool."""
    return get_pool().connection()


import difflib
import re
import unicodedata

def _remove_diacritics(text: str) -> str:
    """Bỏ dấu tiếng Việt: 'có tốt không' -> 'co tot khong'"""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def check_similarity(query: str, target: str) -> float:
    """Kiểm tra độ tương đồng giữa query và tên sản phẩm từ DB."""
    # Chuẩn hóa về không dấu, lowercase trước
    q_norm = _remove_diacritics(query.lower())
    t_norm = _remove_diacritics(target.lower())
    
    noise = [
        'gia bao nhieu', 'bao nhieu tien', 'gia', 'mua', 'o dau',
        'tot khong', 'review', 'danh gia', 'co tot khong', 'nen mua',
    ]
    for n in noise:
        q_norm = q_norm.replace(n, '')
        t_norm = t_norm.replace(n, '')
        
    q_norm = re.sub(r'[^\w\s]', ' ', q_norm).strip()
    t_norm = re.sub(r'[^\w\s]', ' ', t_norm).strip()
    
    q_words = set(q_norm.split())
    t_words = set(t_norm.split())
    
    if not q_words:
        return 0.0
        
    sim = difflib.SequenceMatcher(None, q_norm, t_norm).ratio()
    overlap = len(q_words.intersection(t_words)) / len(q_words)
    
    return (sim * 0.4) + (overlap * 0.6)

def search_products(keyword: str, category: str | None = None, limit: int = 8) -> tuple[list[dict], str]:
    """
    Tìm sản phẩm theo tên. Trả về (results, match_type).
    Dùng check_similarity để validate kết quả.
    """
    if not keyword or not keyword.strip():
        return [], "none"
        
    keyword_clean = keyword.strip()
    
    # Lấy ứng viên từ LIKE search nguyên câu
    candidates = _do_like_search(keyword_clean, category=category, limit=50)
    
    # Nếu không có, thử LIKE các từ khóa quan trọng (min 3 ký tự)
    if not candidates:
        words = keyword_clean.split()
        stopwords = {"gia", "bao", "nhieu", "tien", "nao", "mua", "ban", "co", "tot",
                     "review", "danh", "the", "nen", "nhat", "re", "dau", "loai", "loại",
                     "giá", "nên", "tốt", "rẻ", "nhất", "đâu"}
        meaningful = [w for w in words if len(w) > 2 and w.lower() not in stopwords]
        
        # Lấy tối đa 3 từ quan trọng nhất (ưu tiên có số/chữ hoa)
        meaningful.sort(key=lambda w: (
            not any(c.isdigit() for c in w),
            not any(c.isupper() for c in w),
        ))
        
        for word in meaningful[:3]:
            res = _do_like_search(word, category=category, limit=50)
            candidates.extend(res)
            
    if not candidates:
        return [], "none"
        
    # Loại bỏ duplicate candidate dựa trên 'id' và 'retailer'
    unique_cands = {}
    for c in candidates:
        key = f"{c['id']}_{c['retailer']}"
        if key not in unique_cands:
            unique_cands[key] = c
            
    # Tính điểm similarity cho từng product
    scored_products = {}
    for key, c in unique_cands.items():
        pid = c['id']
        if pid not in scored_products:
            score = check_similarity(keyword_clean, c['name'])
            scored_products[pid] = score
            
    # Lọc threshold và sắp xếp
    THRESHOLD_EXACT = 0.85
    THRESHOLD_PARTIAL = 0.6
    
    exact_pids = {pid: score for pid, score in scored_products.items() if score >= THRESHOLD_EXACT}
    partial_pids = {pid: score for pid, score in scored_products.items() if score >= THRESHOLD_PARTIAL}
    
    passed_pids = exact_pids if exact_pids else partial_pids
    match_type = "exact" if exact_pids else ("partial" if partial_pids else "none")
    
    if not passed_pids:
        return [], "none"
        
    # Sort pids theo điểm giảm dần
    sorted_pids = sorted(passed_pids.keys(), key=lambda pid: passed_pids[pid], reverse=True)
    top_pids = set(sorted_pids[:limit])
    
    # Gom lại các row thuộc về top_pids
    final_rows = [c for c in unique_cands.values() if c['id'] in top_pids]
    
    return final_rows, match_type


def _do_like_search(keyword: str, category: str | None, limit: int) -> list[dict]:
    """Thực thi LIKE query và trả về danh sách sản phẩm có giá."""
    category_clause = ""
    params = [f"%{keyword}%"]
    # Category column doesn't exist in DB, ignoring category filter
    params.append(limit)

    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                sql = f"""
                    SELECT
                        p.id,
                        p.name,
                        p.image_url,
                        p.brand,
                        c.name AS retailer,
                        c.price,
                        c.url AS retailer_url
                    FROM product p
                    JOIN comparison c ON p.id = c.product_id
                    WHERE p.name LIKE %s {category_clause}
                    ORDER BY c.price ASC
                    LIMIT %s
                """
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return rows if rows else []
    except Exception as e:
        print(f"[DB] Search error for '{keyword}': {e}")
        return []


def group_by_product(rows: list[dict]) -> list[dict]:
    """
    Gộp nhiều row có cùng product (từ nhiều retailer) thành 1 product
    với list prices.

    Input row: { id, name, image_url, category, retailer, price, retailer_url }
    Output:    { id, name, image_url, category, prices: [{retailer, price, url}] }
    """
    grouped: dict[int, dict] = {}
    for row in rows:
        pid = row["id"]
        if pid not in grouped:
            grouped[pid] = {
                "id": pid,
                "name": row["name"],
                "image_url": row.get("image_url"),
                "brand": row.get("brand"),
                "prices": [],
            }
        grouped[pid]["prices"].append({
            "retailer": row["retailer"],
            "price": row["price"],
            "url": row["retailer_url"],
        })

    # Sort prices asc trong từng product
    for p in grouped.values():
        p["prices"].sort(key=lambda x: x["price"] or float("inf"))

    return list(grouped.values())


def is_db_available() -> bool:
    """Kiểm tra xem DB có đang chạy không."""
    try:
        conn = get_connection()
        with conn:
            return True
    except Exception:
        return False
