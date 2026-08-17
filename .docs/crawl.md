# PriceHawk — Luồng Crawl & Đổ Dữ Liệu vào Database

> Tài liệu này mô tả toàn bộ luồng từ khi Crawler lấy dữ liệu từ các trang thương mại điện tử cho đến khi dữ liệu được lưu vào MySQL và đồng bộ sang MeiliSearch.

---

## 1. Tổng quan kiến trúc

```
Các trang TMĐT
(TGDD, FPT, Hoàng Hà, CellphoneS)
        │
        ▼
┌─────────────────────┐
│   Scrapy Spiders    │  Thu thập HTML → PhoneItem thô
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ NormalizePhonePipeline │  Chuẩn hóa dữ liệu + tạo identity key
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   BatchDBPipeline   │  Gom batch 100 items → flush
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  BatchDBProcessor   │  Gom nhóm → Insert MySQL → Index MeiliSearch
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
  MySQL    MeiliSearch
(giá, SP) (search index)
```

**Tech stack:**
| Thành phần | Công nghệ |
|---|---|
| Framework crawl | Scrapy |
| Các trang crawl | TGDD, FPT Shop, Hoàng Hà Mobile, CellphoneS |
| Chuẩn hóa dữ liệu | `normalizer.py` (Python thuần) |
| Gom nhóm sản phẩm | `product_matcher.py` |
| Database | MySQL |
| Search Index | MeiliSearch |

---

## 2. Các file chính

| File | Vai trò |
|---|---|
| `price_hawk/spiders/tgdd_spider.py` | Spider crawl Thế Giới Di Động |
| `price_hawk/spiders/fpt_spider.py` | Spider crawl FPT Shop |
| `price_hawk/spiders/hoangha_spider.py` | Spider crawl Hoàng Hà Mobile |
| `price_hawk/spiders/cellphones_spider.py` | Spider crawl CellphoneS |
| `price_hawk/items.py` | Định nghĩa cấu trúc item |
| `price_hawk/normalizer.py` | Chuẩn hóa tên, brand, variant |
| `price_hawk/pipelines.py` | Scrapy pipeline: normalize → batch DB |
| `price_hawk/product_matcher.py` | Gom nhóm sản phẩm từ nhiều nguồn |
| `price_hawk/db_batch_processor.py` | Insert MySQL + Index MeiliSearch |
| `price_hawk/meili_client.py` | Client giao tiếp với MeiliSearch |
| `scripts/index_existing.py` | Backfill dữ liệu cũ vào MeiliSearch |
| `run_crawler.sh` | Script khởi động crawler (có cron job) |
| `crawl_all.py` | Chạy tuần tự tất cả các spider |

---

## 3. Bước 1 — Spider crawl dữ liệu thô

**File:** `price_hawk/spiders/*.py`

Mỗi spider crawl 1 trang web, trả về `PhoneItem` với các trường thô:

```python
class PhoneItem(scrapy.Item):
    source          # "tgdd" | "fpt" | "hoangha" | "cellphones"
    name            # Tên sản phẩm gốc từ trang web
    brand           # Thương hiệu gốc
    model           # Model gốc
    variant         # Biến thể (RAM/ROM/màu)
    price           # Giá hiện tại (string có dấu phẩy, ví dụ "22.990.000₫")
    old_price       # Giá gốc trước khuyến mãi
    in_stock        # Bool
    product_url     # URL trang sản phẩm
    image_url       # URL ảnh
    description     # Mô tả ngắn
    category_path_raw  # Đường dẫn category ("dien-thoai", "laptop", ...)
    scraped_at      # Timestamp UTC
```

**Cấu hình Scrapy:**
```
CONCURRENT_REQUESTS = 8      # Tối đa 8 request song song
DOWNLOAD_DELAY = 0.3         # Delay 0.3s giữa các request
User-Agent: Chrome 124       # Giả lập browser thật
Accept-Language: vi-VN       # Ưu tiên nội dung tiếng Việt
ROBOTSTXT_OBEY = True
```

**Output đồng thời:** Ngoài DB, Scrapy còn xuất file `.jsonl` vào thư mục `data/` theo format:
```
data/{spider_name}_{timestamp}.jsonl
```

---

## 4. Bước 2 — NormalizePhonePipeline (Pipeline 300)

**File:** `price_hawk/pipelines.py` → `price_hawk/normalizer.py`

Đây là bước xử lý và chuẩn hóa item **trước khi insert DB**.

### 4.1 Các bước chuẩn hóa

**Bước 1: Clean text**
```python
name, brand, model, variant → strip(), bỏ None → chuẩn
price "22.990.000₫" → 22990000 (int)
currency → "VND" (gán cứng)
in_stock → True nếu không có giá trị
```

**Bước 2: Phân loại category**
```
category_path_raw → detect loại sản phẩm:
  "laptop", "may-tinh-xach-tay" → Laptop
  "tablet", "may-tinh-bang", "ipad" → Tablet
  Còn lại → Phone (default)
```

**Bước 3: Normalize Identity (hàm `normalize_identity_by_category`)**

Đây là bước quan trọng nhất — tạo ra `identity_key` dùng để nhận dạng và gom nhóm sản phẩm từ nhiều shop khác nhau.

```
Input:  name="Điện thoại iPhone 16 Pro Max 256GB Trắng", brand="Apple"
        category="dien-thoai"

Bước 3a: to_ascii_lower → "dien thoai iphone 16 pro max 256gb trang"
Bước 3b: normalize_brand → brand_norm = "apple"
Bước 3c: extract_color → color_norm = "white" (từ "trang")
Bước 3d: extract_memory → ram=None, rom="256g"
Bước 3e: remove_noise → bỏ "dien thoai", "chinh hang", ...
Bước 3f: remove_memory_tokens → bỏ "256gb"
Bước 3g: remove_color_tokens → bỏ "trang"
Bước 3h: slugify → model_key = "apple-iphone-16-pro-max"
Bước 3i: variant_key = "ram-na_rom-256g_color-white"

Output:
  brand_norm  = "apple"
  model_key   = "apple-iphone-16-pro-max"
  variant_key = "ram-na_rom-256g_color-white"
  identity_key (ghép) = "apple_apple-iphone-16-pro-max_ram-na_rom-256g_color-white"
```

**Bước 4: Confidence Score**

Mỗi item được tính điểm tin cậy để đánh giá chất lượng normalize:

| Tiêu chí | Điểm |
|---|---|
| Base | +0.35 |
| Có brand_norm | +0.20 |
| Có model_key | +0.25 |
| Có ROM | +0.10 |
| Có RAM | +0.05 |
| Có màu sắc | +0.05 |
| **Tổng max** | **1.00** |

**Bước 5: Lọc trường — chỉ giữ lại**
```python
allowed_fields = {
    "source", "product_url", "name", "brand_norm", "model_key",
    "variant_key", "normalize_name", "price", "in_stock",
    "scraped_at", "image_url", "description", "ram", "rom"
}
```
Tất cả các trường thừa (old_price, color_norm, ...) bị xóa khỏi item.

### 4.2 Danh sách Brand được nhận dạng

```
Apple    → apple (iphone, ipad, macbook, mac mini)
Samsung  → samsung (galaxy, galaxy tab, tab)
Xiaomi   → xiaomi (redmi, poco, mi, xiaomi pad)
OPPO     → oppo (reno, find)
Vivo     → vivo
Realme   → realme
Honor    → honor
Nokia    → nokia
Motorola → motorola (moto)
Dell     → dell (inspiron, latitude, xps)
HP       → hp (pavilion, victus, omen)
Asus     → asus (vivobook, zenbook)
Acer     → acer (aspire, swift, nitro, predator)
Lenovo   → lenovo (thinkpad, ideapad)
MSI      → msi
Huawei   → huawei (matebook)
Microsoft→ microsoft (surface)
LG       → lg (gram)
... (và nhiều brand khác)
```

---

## 5. Bước 3 — BatchDBPipeline (Pipeline 400)

**File:** `price_hawk/pipelines.py`

Pipeline này nhận từng item đã normalize và đẩy vào bộ đệm.

```python
class BatchDBPipeline:
    def __init__(self):
        self.db_processor = BatchDBProcessor(batch_size=100)

    def process_item(self, item, spider):
        self.db_processor.add_item(dict(item))  # Thêm vào buffer

    def close_spider(self, spider):
        self.db_processor.flush()   # Flush toàn bộ còn lại
        self.db_processor.close()   # Đóng kết nối DB
```

- **Batch size:** 100 items
- Khi buffer đủ 100 → gọi `flush()` tự động
- Khi spider kết thúc → `close_spider()` flush phần còn lại

---

## 6. Bước 4 — BatchDBProcessor (Insert MySQL + MeiliSearch)

**File:** `price_hawk/db_batch_processor.py`

Đây là trung tâm xử lý cuối cùng — thực hiện gom nhóm và insert vào database.

### 6.1 Luồng xử lý khi `flush()`

```
Buffer [100 items từ nhiều shop]
    │
    ▼
ProductMatcher.group_products(buffer)
    → Gom nhóm: item có brand_norm + model_key + variant_key giống nhau → 1 nhóm
    → Ví dụ: iPhone 16 Pro Max 256GB White từ TGDD + FPT = 1 nhóm, 2 item
    │
    ▼ (vòng lặp từng nhóm)
_insert_group(group)
    │
    ├─ INSERT INTO product (identity_key, name, brand, current_price, ...)
    │    ON DUPLICATE KEY UPDATE description, image_url
    │    (current_price = min giá trong batch hiện tại)
    │
    ├─ SELECT id FROM product WHERE identity_key = ?
    │    → Lấy product_id
    │
    ├─ (vòng lặp từng item trong nhóm)
    │   _insert_comparison(product_id, item)
    │    │
    │    ├─ INSERT INTO comparison (product_id, price, url, ...)
    │    │    ON DUPLICATE KEY UPDATE price, min_price, min_price_at
    │    │
    │    └─ INSERT INTO price_history (product_id, comparison_id, price, retailer)
    │         Chỉ insert nếu giá thay đổi so với lần ghi cuối cùng
    │
    └─ Thêm vào _meili_buffer

(sau khi flush toàn bộ nhóm)
    │
    ▼
index_products_sync(_meili_buffer)
    → Đẩy lên MeiliSearch
```

### 6.2 ProductMatcher — Cơ chế gom nhóm

**File:** `price_hawk/product_matcher.py`

Hai item được gom vào cùng nhóm khi **cả 3 điều kiện sau đều đúng tuyệt đối**:

| Tiêu chí | Điều kiện |
|---|---|
| `brand_norm` | Phải bằng nhau (Apple = Apple) |
| `model_key` | Phải bằng nhau tuyệt đối |
| `variant_key` | Phải bằng nhau (RAM/ROM/màu giống nhau) |

```
TGDD: "iPhone 16 Pro Max 256GB" → model_key="apple-iphone-16-pro-max", variant_key="ram-na_rom-256g_color-na"
FPT:  "iPhone 16 Pro Max 256GB" → model_key="apple-iphone-16-pro-max", variant_key="ram-na_rom-256g_color-na"
→ Khớp 100% → cùng nhóm ✅

TGDD: "iPhone 16 Pro Max 256GB" → variant_key="ram-na_rom-256g_color-na"
FPT:  "iPhone 16 Pro Max 512GB" → variant_key="ram-na_rom-512g_color-na"
→ ROM khác → khác nhóm ❌
```

> **Điều này đảm bảo:** 1 sản phẩm trong DB = 1 model + 1 cấu hình cụ thể (không lẫn 256GB với 512GB).

### 6.3 Schema MySQL

**Bảng `product`** (1 dòng = 1 sản phẩm + cấu hình):
```sql
product (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    identity_key  VARCHAR UNIQUE,   -- "apple_apple-iphone-16-pro-max_..."
    name          VARCHAR,          -- Tên hiển thị
    brand         VARCHAR,          -- "apple"
    description   TEXT,
    image_url     VARCHAR,
    current_price DECIMAL           -- Giá thấp nhất hiện tại
)
```

**Bảng `comparison`** (1 dòng = giá của 1 cửa hàng):
```sql
comparison (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    product_id       INT → FK product.id,
    price            DECIMAL,        -- Giá hiện tại tại shop này
    url              VARCHAR UNIQUE, -- URL sản phẩm tại shop
    name             VARCHAR,        -- Tên shop (retailer)
    current_price_at DATETIME,
    min_price        DECIMAL,        -- Giá thấp nhất lịch sử tại shop này
    min_price_at     DATETIME
)
```

**Bảng `price_history`** (lịch sử giá):
```sql
price_history (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    product_id    INT → FK product.id,
    comparison_id INT → FK comparison.id,
    price         DECIMAL,
    retailer      VARCHAR,
    recorded_at   DATETIME
)
```

> **Lưu ý:** `price_history` chỉ insert khi giá **thay đổi** so với lần ghi gần nhất — tránh duplicate khi crawler chạy nhiều lần trong ngày mà giá không đổi.

### 6.4 ON DUPLICATE KEY UPDATE Logic

**Bảng `product`:** Khi cùng `identity_key` đã tồn tại:
- Update `description`, `image_url` (lấy thông tin mới nhất)
- `current_price` = min giá trong batch

**Bảng `comparison`:** Khi cùng `url` đã tồn tại:
- Update `price` (giá mới nhất)
- `min_price` = `CASE WHEN price < min_price THEN price ELSE min_price END`
- `min_price_at` cập nhật timestamp nếu có giá mới thấp hơn

---

## 7. Bước 5 — Index vào MeiliSearch

Sau khi toàn bộ MySQL insert thành công, `BatchDBProcessor` gọi:

```python
index_products_sync(self._meili_buffer)
```

**Mỗi document đẩy lên MeiliSearch:**
```json
{
  "id": 42,
  "name": "Apple iPhone 16 Pro Max 256GB",
  "brand": "apple",
  "identity_key": "apple_apple-iphone-16-pro-max_ram-na_rom-256g_color-na",
  "current_price": 33990000.0
}
```

> **MeiliSearch chỉ là search index** — không phải source of truth. Mọi thay đổi giá cuối cùng đều phải lấy từ MySQL.

---

## 8. Lịch chạy Crawler (run_crawler.sh)

```bash
# Chạy thủ công
./price-hawk/run_crawler.sh

# Cấu hình cron job (ví dụ: chạy 2 lần/ngày)
0 6,18 * * * /app/price-hawk/run_crawler.sh
```

**Luồng script `run_crawler.sh`:**
```
1. Kích hoạt Python venv
2. Kiểm tra MeiliSearch có trống không
   → Nếu trống → chạy scripts/index_existing.py (backfill 1 lần)
3. Chạy crawl_all.py (tuần tự tất cả 4 spider)
4. Ghi log vào logs/crawler_{timestamp}.log
```

**`crawl_all.py` chạy các spider theo thứ tự:**
```
1. tgdd_spider     → Thế Giới Di Động
2. fpt_spider      → FPT Shop
3. hoangha_spider  → Hoàng Hà Mobile
4. cellphones_spider → CellphoneS
```

---

## 9. Ví dụ end-to-end

**Input:** FPT Spider crawl được:
```
name = "Điện thoại Samsung Galaxy S25 Ultra 12GB/256GB"
price = "31.990.000₫"
source = "fpt"
url = "https://fptshop.com.vn/dien-thoai/samsung-galaxy-s25-ultra"
```

**Sau NormalizePhonePipeline:**
```
name        = "Điện thoại Samsung Galaxy S25 Ultra 12GB/256GB"
brand_norm  = "samsung"
model_key   = "samsung-galaxy-s25-ultra"
variant_key = "ram-12g_rom-256g_color-na"
price       = 31990000
```

**Sau ProductMatcher (nếu TGDD cũng có cùng máy):**
```
Nhóm 1:
  - FPT:  S25 Ultra 12/256 → 31.990.000đ
  - TGDD: S25 Ultra 12/256 → 32.490.000đ
```

**Insert MySQL:**
```sql
-- product
INSERT INTO product (identity_key, name, brand, current_price)
VALUES ('samsung_samsung-galaxy-s25-ultra_ram-12g_rom-256g_color-na',
        'Điện thoại Samsung Galaxy S25 Ultra 12GB/256GB',
        'samsung', 31990000)
ON DUPLICATE KEY UPDATE current_price = 31990000;

-- comparison × 2 (FPT + TGDD)
INSERT INTO comparison (product_id, price, url, name) VALUES (?, 31990000, 'https://fptshop...', 'fpt');
INSERT INTO comparison (product_id, price, url, name) VALUES (?, 32490000, 'https://tgdd...', 'tgdd');

-- price_history × 2 (nếu giá thay đổi)
INSERT INTO price_history (product_id, comparison_id, price, retailer) VALUES (...);
```

**Index MeiliSearch:**
```json
{
  "id": 123,
  "name": "Điện thoại Samsung Galaxy S25 Ultra 12GB/256GB",
  "brand": "samsung",
  "identity_key": "samsung_samsung-galaxy-s25-ultra_ram-12g_rom-256g_color-na",
  "current_price": 31990000.0
}
```
