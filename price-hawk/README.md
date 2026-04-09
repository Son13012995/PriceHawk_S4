# Price Hawk - VN Phone MVP (Scrapy)

MVP crawl 4 websites:
- TGDĐ
- FPT Shop
- HoangHaMobile
- CellphoneS

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run spiders

```bash
scrapy crawl tgdd_phone
scrapy crawl fpt_phone
scrapy crawl hoangha_phone
scrapy crawl cellphones_phone
```

Multi-category crawl for FPT (recommended for scaling):

```bash
scrapy crawl fpt_catalog -a category=dien-thoai
scrapy crawl fpt_catalog -a category=laptop
scrapy crawl fpt_catalog -a category=tablet
```

`fpt_phone` is kept for backward compatibility and is equivalent to `fpt_catalog -a category=dien-thoai`.

Multi-category crawl for TGDD:

```bash
scrapy crawl tgdd_catalog -a category=dien-thoai
scrapy crawl tgdd_catalog -a category=laptop
scrapy crawl tgdd_catalog -a category=tablet
```

`tgdd_phone` is kept for backward compatibility and is equivalent to `tgdd_catalog -a category=dien-thoai`.

Multi-category crawl for HoangHa:

```bash
scrapy crawl hoangha_catalog -a category=dien-thoai
scrapy crawl hoangha_catalog -a category=laptop
scrapy crawl hoangha_catalog -a category=tablet
```

`hoangha_phone` is kept for backward compatibility and is equivalent to `hoangha_catalog -a category=dien-thoai`.

Output files are written to `data/` as JSONL via Scrapy FEEDS config.

## Load Data Into MySQL

### 1. Create schema

```bash
mysql -u root -p price_hawk < sql/mysql_schema.sql
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure connection and import all `*_full.jsonl`

```bash
# edit .env (or copy from .env.example)

python scripts/load_jsonl_to_mysql.py
```

Environment variables read by the loader:
- MYSQL_HOST
- MYSQL_PORT
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DB

The loader automatically:
- Upserts `platforms`
- Upserts `categories` from filename suffix (`dien-thoai`, `laptop`, `tablet`)
- Upserts `products` by unique key `(category_id, normalize_name)`
- Inserts/updates `price_records` by unique key `(product_id, platform_id, crawled_at)`

## Build Cross-Platform Product Merge Map

To compare prices across stores, generate a canonical mapping from many source products to one product id:

```bash
python scripts/build_product_merge_map.py
```

This script:
- Creates table `product_merge_map` if missing
- Maps products using `category + model_key` first, then soft `variant_key` matching
- Prints top spread (price gap) across platforms after mapping

## Unified item schema

- source
- product_id
- name
- brand
- model
- variant
- price
- old_price
- currency
- in_stock
- product_url
- image_url
- scraped_at

## Notes

- This MVP prioritizes static extraction and JSON-LD first.
- If a site changes HTML, update selectors in each spider.
- Respect robots.txt and crawl delay in settings.
