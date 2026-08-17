# MeiliSearch Integration — PriceHawk

## Tổng quan

MeiliSearch được tích hợp vào PriceHawk để làm **search index** thay thế MySQL LIKE query thuần túy. MySQL vẫn là **nguồn dữ liệu chính** (source of truth) — MeiliSearch chỉ đảm nhận vai trò tìm kiếm nhanh với khả năng chịu lỗi chính tả (typo tolerance) và fuzzy matching.

```
User query
    │
    ▼
[DBAgent] MeiliSearch search (< 5ms)
    │
    ├── Hits found + score ≥ 0.95 → exact match → fetch prices từ MySQL
    ├── Hits found + score < 0.95 → partial match → fetch prices từ MySQL
    └── No hits → fallback MySQL LIKE search
```

---

## Kiến trúc

| Thành phần | File | Vai trò |
|---|---|---|
| Docker service | `docker-compose.yml` | Chạy MeiliSearch container |
| Crawler indexer | `price-hawk/price_hawk/meili_client.py` | Index sản phẩm mới khi crawl |
| Backfill script | `price-hawk/scripts/index_existing.py` | Index toàn bộ DB cũ vào MeiliSearch |
| Chatbot client | `chatbot/meili_client.py` | Search từ chatbot (async) |
| DB Agent | `chatbot/agents/db_agent.py` | Orchestrate MeiliSearch → MySQL |

---

## Cấu hình Docker

```yaml
# docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:v1.13
  container_name: meilisearch
  ports:
    - "7700:7700"
  environment:
    - MEILI_MASTER_KEY=pricehawk-meili-master-key-2026
    - MEILI_ENV=development
  volumes:
    - meili_data:/meili_data   # persistent storage
  deploy:
    resources:
      limits:
        cpus: '0.20'
        memory: 256M
```

> **URL nội bộ (Docker network):** `http://meilisearch:7700`  
> **URL local:** `http://localhost:7700`  
> **Admin UI:** `http://localhost:7700` (mở browser trực tiếp)

---

## Index Configuration

Index name: **`products`**  
Primary key: **`id`**

| Setting | Giá trị |
|---|---|
| `searchableAttributes` | `name`, `brand`, `identity_key` |
| `filterableAttributes` | `brand` |
| `sortableAttributes` | `current_price` |
| `typoTolerance.oneTypo` | Từ ≥ 3 ký tự |
| `typoTolerance.twoTypos` | Từ ≥ 5 ký tự |

**Document schema:**
```json
{
  "id": 123,
  "name": "Apple iPhone 16 Pro Max 256GB",
  "brand": "Apple",
  "identity_key": "apple-iphone-16-pro-max",
  "current_price": 33990000.0
}
```

---

## Backfill — Index dữ liệu cũ

Chạy **một lần duy nhất** sau khi khởi động MeiliSearch lần đầu để đẩy toàn bộ sản phẩm từ MySQL vào index:

```bash
# Từ thư mục gốc project
python price-hawk/scripts/index_existing.py
```

Script sẽ:
1. Tạo index và cấu hình searchable attributes
2. Fetch toàn bộ bảng `product` từ MySQL
3. Index theo batch 1000 sản phẩm/lần

> **Lưu ý:** Đảm bảo MeiliSearch đang chạy và `.env` có đủ `MEILI_URL`, `MYSQL_HOST`, `MYSQL_PASSWORD` trước khi chạy.

---

## Tự động Index khi Crawl

Khi crawler thu thập sản phẩm mới, `db_batch_processor.py` tự động gọi `meili_client.index_products_sync()` để cập nhật index sau khi insert vào MySQL. Không cần chạy backfill thủ công mỗi lần crawl.

---

## Ranking Score & Match Type

Chatbot DBAgent dùng `_rankingScore` để phân loại kết quả:

| Score | Match type | Hành vi |
|---|---|---|
| ≥ 0.95 | `exact` | Trả kết quả ngay |
| 0.0 – 0.95 | `partial` | Trả kết quả, pipeline thử Internet để xác nhận thêm |
| No hits | `miss` | Fallback MySQL LIKE search |

---

## Fallback Chain

MeiliSearch được thiết kế **non-blocking** — nếu service down, chatbot vẫn hoạt động bình thường qua MySQL:

```
MeiliSearch available?
    ├── Yes → search MeiliSearch → fetch prices MySQL
    └── No  → MySQL LIKE search (behavior trước khi có MeiliSearch)
```

Timeout cho mỗi request MeiliSearch: **5 giây**.

---

## Biến môi trường

| Biến | Default | Mô tả |
|---|---|---|
| `MEILI_URL` | `http://meilisearch:7700` | URL MeiliSearch (Docker: dùng service name) |
| `MEILI_MASTER_KEY` | `pricehawk-meili-master-key-2026` | Master key xác thực |

> **Trong container Docker:** dùng `http://meilisearch:7700`  
> **Chạy local (ngoài Docker):** dùng `http://localhost:7700`

---

## Kiểm tra nhanh

```bash
# Kiểm tra MeiliSearch đang chạy
curl http://localhost:7700/health

# Xem số documents trong index
curl http://localhost:7700/indexes/products/stats \
  -H "Authorization: Bearer pricehawk-meili-master-key-2026"

# Test search thủ công
curl -X POST http://localhost:7700/indexes/products/search \
  -H "Authorization: Bearer pricehawk-meili-master-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"q": "iphone 16 pro", "limit": 5, "showRankingScore": true}'
```
