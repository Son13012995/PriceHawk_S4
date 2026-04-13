# PriceHawk - Deployment Architecture & Workflow

## System Overview

**PriceHawk** là hệ thống so sánh giá điện tử tự động, gồm 2 phần:

1. **Backend Crawler** (Python/Scrapy) - Tự động cào giá định kỳ
2. **Frontend Web** (Next.js) - Hiển thị so sánh giá

---

## Architecture Components

```
┌─────────────────────────────────────────────────────┐
│  PriceHawk System                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─── Frontend (Next.js 14.0.3) ───┐              │
│  │  - Product listing page          │              │
│  │  - Product detail page           │              │
│  │  - Search functionality          │              │
│  │  - Price comparison UI           │              │
│  └──────────────────────────────────┘              │
│           ↓                                         │
│  ┌─── Backend API (Next.js API Routes) ───┐       │
│  │  - /api/product - Get product list      │       │
│  │  - /api/compare - Get price comparison  │       │
│  │  - /api/pagination - Search            │       │
│  │  - /api/price-alert - Price alerts     │       │
│  │  - /api/wishlist - User wishlist       │       │
│  └─────────────────────────────────────────┘       │
│           ↓                                         │
│  ┌─── MySQL Database ───┐                         │
│  │  - product table     │                         │
│  │  - comparison table  │                         │
│  │  - wishlist table    │                         │
│  │  - price-alert table │                         │
│  └──────────────────────┘                         │
│  ▲                                                 │
│  │ (Direct connection from API)                   │
│                                                     │
│  ┌─── Crawler System (Scrapy) ────┐              │
│  │  ┌─ 9 Spiders ────────────────└─┐             │
│  │  │  • tgdd_phone                 │             │
│  │  │  • tgdd_laptop                │             │
│  │  │  • tgdd_tablet                │             │
│  │  │  • fpt_phone                  │             │
│  │  │  • fpt_laptop                 │             │
│  │  │  • fpt_tablet                 │             │
│  │  │  • hoangha_phone              │             │
│  │  │  • hoangha_laptop             │             │
│  │  │  • hoangha_tablet             │             │
│  │  └─────────────────────────────┘             │
│  │           ↓                                    │
│  │  ┌─ Pipeline Processing ──┐                   │
│  │  │ • NormalizePhonePipeline │                  │
│  │  │ • Extract RAM/ROM/Brand │                  │
│  │  └────────────────────────┘                   │
│  │           ↓                                    │
│  │  ┌─ ProductMatcher (Grouping) ┐              │
│  │  │ • Match by brand+model_key  │              │
│  │  │ • Group same products       │              │
│  │  └────────────────────────────┘              │
│  │           ↓                                    │
│  │  ┌─ BatchDBProcessor ─────────┐              │
│  │  │ • Match by URL (primary)    │              │
│  │  │ • Match by name+brand       │              │
│  │  │ • INSERT or UPDATE DB       │              │
│  │  └────────────────────────────┘              │
│  └──────────────────────────────────┘             │
│           ↓                                       │
│       MySQL Database                             │
│                                                   │
└─────────────────────────────────────────────────────┘
```

---

## Detailed Workflow

### 1. **Auto Crawl Trigger** (Every 5 minutes via Cron)

**Where:** Docker container `price_hawk_crawler` (Linux Cron daemon)

**Cron Schedule:** `*/5 * * * *` (5-minute intervals)

**Action:**

```bash
# Runs inside Docker
/app/price-hawk/run_crawler.sh
  └─ python crawl_all.py
      └─ python scripts/run_simple_crawl.py
```

---

### 2. **Crawling Phase** (~4 minutes per cycle)

**9 Spiders execute in parallel** (3 workers per ThreadPoolExecutor):

```
Cycle Start →
  ├─ tgdd_phone → Scrape thegioididong.com phone listings
  ├─ tgdd_laptop → Scrape thegioididong.com laptop listings
  ├─ tgdd_tablet → Scrape thegioididong.com tablet listings
  ├─ fpt_phone → Scrape fptshop.com.vn phone listings
  ├─ fpt_laptop → Scrape fptshop.com.vn laptop listings
  ├─ fpt_tablet → Scrape fptshop.com.vn tablet listings
  ├─ hoangha_phone → Scrape hoanghamobile.com phone listings
  ├─ hoangha_laptop → Scrape hoanghamobile.com laptop listings
  └─ hoangha_tablet → Scrape hoanghamobile.com tablet listings

Result: 1,400+ product JSON objects (each with: name, price, URL, image, brand, etc.)
```

**Each spider outputs:** `data/shop_category_crawl.jsonl` (500-item buffer)

---

### 3. **Data Normalization Pipeline** (Inline during crawl)

**For each crawled item:**

1. **Normalize text** - Remove extra spaces, convert to lowercase
2. **Extract metadata:**
   - Brand: Xiaomi, Apple, Samsung, etc.
   - RAM/ROM: "12GB", "256GB", "1TB"
   - Color: "Black", "Silver", etc.
   - Category: Phone, Laptop, Tablet

3. **Generate keys:**
   - `brand_norm`: "xiaomi" → standardized
   - `model_key`: "xiaomi-15t-pro" → model identifier
   - `variant_key`: "ram-12gb_rom-256gb_color-na" → variant specification

**Pipeline Output:** Standardized item with normalized fields

---

### 4. **Product Matching & Grouping** (ProductMatcher)

**Logic (STRICT mode - current):**

```
For each crawled item:
  1. Check: brand_norm match?  → NO → NEW product
                                → YES → Continue
  2. Check: model_key match?   → NO → NEW product
                                → YES → Continue
  3. Check: variant_key match? → NO → NEW product (STRICT!)
                                → YES → SAME product group
```

**Example (Current Behavior):**

```
Xiaomi 15T Pro/256GB (TGDD) + model_key="xiaomi-15t-pro", variant_key="ram-12gb_rom-256gb"
Xiaomi 15T Pro/512GB (HoangHa) + model_key="xiaomi-15t-pro", variant_key="ram-12gb_rom-512gb"

Result: DIFFERENT variant_key → 2 separate products (ID 518, ID 1301)
        (Not grouped together due to STRICT matching)
```

---

### 5. **Batch DB Insertion** (BatchDBProcessor)

**For each product group:**

1. **Find or create product record:**

   ```
   If URL exists in comparison table:
     → Reuse product_id
   Else if name + brand exists in product table:
     → Reuse product_id
   Else:
     → INSERT new product
   ```

2. **Insert/Update comparison records:**
   ```
   For each variant in group:
     If (product_id, URL) exists:
       → UPDATE price
     Else:
       → INSERT new comparison
   ```

**Example:**

```
Product: Xiaomi 15T Pro (ID 1301)
├─ Comparison 1: TGDD 256GB → URL1, Price 17.19M
├─ Comparison 2: TGDD 512GB → URL2, Price 19.49M
└─ Comparison 3: TGDD 1TB → URL3, Price 21.49M

On next crawl (5 min later):
├─ URL1 price = 17.29M → UPDATE (no duplicate)
├─ URL2 price = 19.59M → UPDATE (no duplicate)
└─ URL3 price = 21.59M → UPDATE (no duplicate)
```

**Anti-Duplicate Logic:**

- ✅ Primary key: `(product_id, url)` pair - ensures uniqueness
- ✅ Fallback: `name + brand` matching - prevents duplicate products
- ✅ Result: **Zero duplicates on re-crawl**

---

### 6. **Frontend Data Display**

**User visits:** `localhost:3000/product/1301`

**Frontend fetches:**

```javascript
GET /api/compare?id=1301
  ↓
Returns:
{
  product: [{
    id: 1301,
    name: "Xiaomi 15T Pro",
    brand: "xiaomi",
    image_url: "https://...",
    current_price: 17190000,  // MIN price across all retailers
    min_price: 17190000,
    retailer_count: 3
  }],
  comparison: [
    { product_id: 1301, price: 17190000, url: "https://...", name: "tgdd" },
    { product_id: 1301, price: 19490000, url: "https://...", name: "hoangha" },
    { product_id: 1301, price: 21690000, url: "https://...", name: "tgdd" }
  ]
}
```

**UI renders:** All 3 prices in a comparison card

---

## Database Schema

### `product` table

```sql
CREATE TABLE product (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  brand VARCHAR(100),
  current_price FLOAT
);
```

### `comparison` table

```sql
CREATE TABLE comparison (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT,
  price FLOAT NOT NULL,
  url TEXT UNIQUE,          -- ← Prevents duplicate URLs
  name VARCHAR(100),        -- ← Source (fpt, tgdd, hoangha)
  FOREIGN KEY (product_id) REFERENCES product(id),
  INDEX idx_comparison_product_price (product_id, price)
);
```

---

## Current Deployment Status

### **Crawler (Docker Container)**

```
Service: price_hawk_crawler
Base Image: python:3.12-slim
Cron Schedule: */5 * * * *
Scripts:
  - run_crawler.sh - Entry point
  - crawl_all.py - Orchestrator
  - scripts/run_simple_crawl.py - Parallel executor
Log: /app/price-hawk/logs/cron.log
```

### **Frontend + API (Next.js - Local Dev)**

```
Server: localhost:3000
Build: npm run build
Dev: npm run dev
Database Connection: 127.0.0.1:3306 (local MySQL)
```

### **Database (MySQL - Local)**

```
Host: 127.0.0.1
Port: 3306
Database: pricecomparison
Tables: product, comparison, wishlist, price-alert
```

---

## For Full App Docker Compose Deployment

**To deploy entire system (Frontend + Crawler + Database) in Docker:**

Your `docker-compose.yml` should include:

```yaml
services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ...
      MYSQL_DATABASE: pricecomparison
    volumes:
      - mysql_data:/var/lib/mysql
      - ./setup.sql:/docker-entrypoint-initdb.d/setup.sql
    ports:
      - "3306:3306"

  # Crawler Container (EXISTING)
  crawler:
    build:
      context: ./price-hawk
      dockerfile: docker/Dockerfile.cron
    depends_on:
      - mysql
    volumes:
      - ./price-hawk:/app/price-hawk
      - ./price-hawk/logs:/app/price-hawk/logs
    env_file:
      - ./price-hawk/.env
    environment:
      - TZ=Asia/Ho_Chi_Minh
      - MYSQL_HOST=mysql
    restart: unless-stopped

  # Next.js Frontend + API
  web:
    build:
      context: .
      dockerfile: Dockerfile.web # ← Create this
    ports:
      - "3000:3000"
    depends_on:
      - mysql
    environment:
      - DATABASE_URL=mysql://root:password@mysql:3306/pricecomparison
    volumes:
      - .:/app

volumes:
  mysql_data:
```

---

## Key Metrics (Current Run)

| Metric                     | Value      |
| -------------------------- | ---------- |
| Total Products             | 1,413      |
| Total Comparisons          | 1,409      |
| FPT Records                | 673        |
| TGDD Records               | 611        |
| HoangHa Records            | 125        |
| Crawl Duration             | ~4 minutes |
| Cron Interval              | 5 minutes  |
| Database No-Duplicate Rate | 100% ✓     |

---

## Known Limitations

1. **Product Variant Splitting** - Xiaomi 15T Pro 256GB/512GB/1TB currently in 4 separate product IDs due to STRICT variant matching
   - Status: Can relax `ProductMatcher` logic to merge by `model_key` only
2. **Schema** - No dedicated `variant_id` column (all variants grouped under single product)
   - Status: Can add later if needed

---

## Next Steps for Full Deployment

1. ✅ Crawler working (running in Docker container)
2. ✅ Database populated (1,413 products, auto-updating every 5 min)
3. ✅ Frontend queries working (localhost:3000)
4. ⏳ Full Docker Compose stack (frontend + crawler + MySQL) - Your turn!

---

**Created:** April 13, 2026
**Maintainers:** PriceHawk Team
