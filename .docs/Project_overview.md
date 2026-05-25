# PriceHawk S4 — CLAUDE.md

**Cập nhật lần cuối:** 25/05/2026 — Refactor API Service Layer: tập trung toàn bộ API call vào `lib/apiClient.js`.

---

## Tổng quan project

- **Project là gì:** Hệ thống so sánh giá đồ điện tử (điện thoại, laptop, tablet) tự động từ các sàn TMĐT Việt Nam. Crawler chạy định kỳ 5 phút/lần, frontend hiển thị so sánh giá theo thời gian thực.
- **Dùng cho ai:** Người dùng cuối muốn so sánh giá sản phẩm công nghệ; Admin/Dev quản lý hệ thống crawler.
- **Chạy ở đâu:** Web app (Next.js) + Docker Compose stack gồm web + MySQL + crawler.
- **Tech stack chính:**
  - Frontend: Next.js 14.0.3, React 18, Tailwind CSS 3.3, next-themes
  - Backend: Next.js API Routes (Node.js), Express pattern, MySQL2 pool
  - Database: MySQL 8.0 (schema `pricecomparison`)
  - Crawler: Python 3.12, Scrapy, pymysql
  - Platform: Docker Compose (3 services: `mysql`, `main`, `crawler`)
- **Điều đặc biệt cần lưu ý:** ⚠️ Dự án có cả App Router (`app/`) và Pages Router (`pages/api/`). API routes nằm trong `pages/api/`; UI pages nằm trong `app/`. Crawler và web app chia sẻ chung DB `pricecomparison`.

---

## Môi trường & Lệnh chạy

- **OS:** Windows (dev local), Linux (Docker production)
- **Runtime version:** Node.js (khuyến nghị v18+ / v20+), Python 3.12
- **Package manager:** npm (có package-lock.json)
- **Project path:** `e:\Hoc\code\PriceHawk_S4`

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy Next.js dev server ở `localhost:3000` |
| `npm run build` | Build production (output vào `.next/`) |
| `npm run start` | Chạy production server |
| `npm run lint` | Chạy ESLint |
| `docker-compose up --build` | Build & chạy toàn bộ stack (MySQL + Web + Crawler) |

**Lưu ý môi trường:**
- ⚠️ Phải có file `.env.local` hoặc `.env_product` với `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- OAuth social login cần thêm: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — nếu bỏ trống thì provider đó tự động bị skip (không crash)
- MySQL Docker expose port `3307:3306` (tránh conflict với local MySQL)
- Crawler container dùng `TZ=Asia/Ho_Chi_Minh` và cron `*/5 * * * *`
- Web container đọc env từ `.env_product`
- `node_modules` và `.next` nằm trong `.gitignore` — phải `npm install` sau clone

---

## Cấu trúc thư mục

```
PriceHawk_S4/
├── app/                          # ✅ Next.js App Router — UI pages
│   ├── page.js                   # ✅ Home page (landing + brands + demo products)
│   ├── layout.js                 # ✅ Root layout: Navbar + ThemeProvider + metadata
│   ├── globals.css               # ✅ Global styles + Tailwind directives
│   ├── product/
│   │   ├── page.js               # ✅ Product listing (dùng ProductBrowser)
│   │   └── [id]/page.jsx         # ✅ Product detail: so sánh giá, wishlist, price alert
│   ├── search/[searchTerm]/page.js # ✅ Search results (dùng ProductBrowser)
│   ├── wishlist/page.js          # ✅ Wishlist management
│   ├── alerts/page.js            # ✅ Price alerts center (SWR auto-refresh 5s)
│   ├── price-history/[id]/page.jsx # ⚠️ Price history page (chưa rõ độ hoàn thiện)
│   ├── api-docs/page.jsx         # ✅ Swagger UI docs
│   └── utils/format.js           # ✅ formatPrice, formatPriceInput, parsePriceInput
│
├── components/                   # ✅ Shared React components
│   ├── Navbar.jsx                # ✅ Sticky nav + search + theme toggle + PageTabs
│   ├── ProductBrowser.jsx        # ✅ Core listing component (pagination + search)
│   ├── SearchCard.jsx            # ✅ Card hiển thị sản phẩm trong grid
│   ├── ThemeProvider.jsx         # ✅ next-themes wrapper
│   ├── ThemeToggle.jsx           # ✅ Dark/light mode toggle
│   └── ui/                       # ✅ Design system & reusable UI
│       ├── AppSearchBar.jsx      # ✅ Search input redirect → /search/:term
│       ├── PageTabs.jsx          # ✅ Navigation tabs (Product, Wishlist, Alerts)
│       ├── ProductSearch.jsx     # ✅ Autocomplete search để chọn product (dùng trong alerts/wishlist)
│       └── designSystem.js       # ✅ cn(), ui tokens (pageWrap, card, heading, buttons...)
│
├── pages/api/                    # ✅ Next.js Pages Router — API endpoints
│   ├── database.js               # ⚠️ SINGLE SOURCE OF TRUTH — MySQL pool connection
│   ├── product.js                # ✅ GET /api/product?id=&page=&pageSize=
│   ├── compare.js                # ✅ GET /api/compare?id= — product + comparison prices
│   ├── pagination.js             # ✅ GET /api/pagination?q=&page=&pageSize=
│   ├── price-alert.js            # ✅ Full CRUD + trigger check for price alerts
│   └── wishlist.js               # ✅ POST/GET/DELETE wishlist
│
├── lib/                          # ⚠️ Utilities (MỘT SỐ FILE TRỐNG — cần kiểm tra)
│   ├── apiClient.js              # ✅ Centralized API Service Layer — SINGLE SOURCE OF TRUTH cho mọi HTTP call từ client
│   │                             #    Products: getProducts, searchProducts, getProductDetail, getPriceHistory
│   │                             #    Wishlist: getWishlist, addToWishlist, removeFromWishlist
│   │                             #    Alerts:   getAlerts, checkTriggeredAlerts, createAlert, updateAlertStatus, deleteAlert
│   │                             #    Auth:     registerUser
│   ├── swagger.js                # ✅ Swagger spec generator
│   ├── checkPriceAlerts.js       # ❌ TRỐNG — logic nằm trong pages/api/price-alert.js
│   └── cronJobs.js               # ❌ TRỐNG — cron nằm trong Docker container
│
├── price-hawk/                   # ✅ Python Scrapy crawler system
│   ├── crawl_all.py              # ✅ Orchestrator chạy 9 spiders song song
│   ├── price_hawk/
│   │   ├── settings.py           # ✅ Scrapy config: pipelines, headers, feeds
│   │   ├── items.py              # ✅ PhoneItem schema (source, name, brand, price, URL...)
│   │   ├── pipelines.py          # ✅ NormalizePhonePipeline + BatchDBPipeline
│   │   ├── normalizer.py         # ⚠️ CORE LOGIC — trích xuất brand/model/ram/rom/color
│   │   ├── product_matcher.py    # ⚠️ STRICT matching — group by brand+model+variant
│   │   ├── db_batch_processor.py # ✅ Insert/Update DB với ProductMatcher + ON DUPLICATE KEY
│   │   └── spiders/
│   │       ├── tgdd_spider.py    # ✅ TGDD: phone, laptop, tablet
│   │       ├── fpt_spider.py     # ✅ FPT Shop
│   │       ├── hoangha_spider.py # ✅ Hoàng Hà Mobile
│   │       ├── cellphones_spider.py # ⚠️ Code có nhưng chưa chắc đã active trong crawl_all
│   │       └── utils.py          # ✅ Helper: extract JSON-LD, image URL, clean text
│   ├── docker/Dockerfile.cron    # ✅ Docker image cho crawler (cron + python)
│   └── .env_product              # ⚠️ Env cho crawler (MYSQL_HOST, USER, PASS, DB)
│
├── public/                       # ✅ Static assets (people.jpg, favicon...)
├── docker-compose.yml            # ✅ 3 services: mysql (3307), main (3000), crawler
├── Dockerfile                    # ✅ Web app Dockerfile (Next.js)
├── next.config.js                # ✅ Image domains + SWC minify + compress
├── tailwind.config.js            # ✅ darkMode: "class", content paths
├── package.json                  # ✅ Dependencies + scripts
├── init.sql                      # ⚠️ Database schema (file binary/null bytes — đọc qua dump hoặc code)
└── DEPLOY.md                     # ✅ Architecture docs, metrics, known limitations
```

---

## Kiến trúc & Data Flow

### Luồng dữ liệu chính

```
[Spider TGDD/FPT/HoangHa] → [Scrapy Item]
         ↓
[NormalizePhonePipeline] → clean text, parse price, extract brand/model/ram/rom/color
         ↓
[ProductMatcher] → STRICT group: brand_norm + model_key + variant_key phải khớp 100%
         ↓
[BatchDBProcessor] → INSERT/UPDATE MySQL (product + comparison) với ON DUPLICATE KEY
         ↓
[MySQL pricecomparison DB]
         ↑
[Next.js API Routes] → database.js (mysql2 pool) → query → JSON response
         ↑
[Frontend Pages] → axios / apiClient.js / SWR → UI render
```

### Các lớp kiến trúc
- **UI Layer:** `app/*`, `components/*` — React Server/Client Components, Tailwind, SWR
- **Business Logic:** `pages/api/*` — REST handlers, validation, SQL query construction
- **Data Layer:** `lib/database.js` — MySQL pool connection (duy nhất), `db_batch_processor.py` — Python DB writer
- **External Services:** Scrapy spiders gọi HTTP đến TGDD, FPT, HoangHa

### Cách các module giao tiếp
- Frontend ↔ Backend: REST API qua axios (baseURL `/api`)
- Backend ↔ DB: mysql2 pool qua `database.js` (connectionLimit: 10)
- Crawler ↔ DB: pymysql trực tiếp qua `BatchDBProcessor`
- ⚠️ KHÔNG có IPC, KHÔNG có message queue — tất cả giao tiếp qua MySQL hoặc HTTP

### State management
- **Client state:** React `useState`, `useEffect` — không dùng Redux/Zustand
- **Server state:** SWR (alerts auto-refresh 5s), axios thường cho product listing
- **Global UI state:** `next-themes` (dark/light mode)
- **Persistent state:** MySQL DB — KHÔNG dùng localStorage cho business data

---

## API & External Services

| Service | Dùng cho | Key lưu ở đâu | Lưu ý |
|---------|----------|---------------|-------|
| thegioididong.com | Crawl điện thoại, laptop, tablet | Không cần key | Rate limit: DOWNLOAD_DELAY=0.3s, CONCURRENT_REQUESTS=8 |
| fptshop.com.vn | Crawl điện thoại, laptop, tablet | Không cần key | Tương tự TGDD |
| hoanghamobile.com | Crawl điện thoại, laptop, tablet | Không cần key | Số lượng ít hơn |
| Google Favicons | Hiển thị logo retailer trên UI | Không cần key | Dùng `https://www.google.com/s2/favicons?domain=...` |
| MySQL Local/Docker | Lưu trữ toàn bộ data | `.env_product` / `.env.local` | Host khác nhau giữa dev và Docker |

### Fallback chains
Không có fallback chain cho external services. Nếu spider fail → log lỗi, không có data mới cho site đó.

### Conventions quan trọng
- ⚠️ KHÔNG crawl quá nhanh: `DOWNLOAD_DELAY = 0.3`, `ROBOTSTXT_OBEY = True`
- KHÔNG commit DB trực tiếp từ spider ngoài `BatchDBPipeline`

---

## Database & Storage Schema

### Tables chính

| Table | Mô tả | Quan hệ |
|-------|-------|---------|
| `product` | Sản phẩm đã group (identity_key UNIQUE) | 1 ————< n `comparison` |
| `comparison` | Giá từng retailer cho 1 product (url UNIQUE) | n ————> 1 `product` |
| `wishlist` | Sản phẩm user lưu (userId nullable) | n ————> 1 `product` |
| `price_alert` | Cảnh báo giá target (status: active/triggered/inactive) | n ————> 1 `product` |

### Schema tóm tắt

```sql
product:
  id INT PK AUTO_INCREMENT
  identity_key VARCHAR UNIQUE          -- brand_model_variant (vd: xiaomi-15t-pro_ram-12gb_rom-256gb_color-na)
  name TEXT
  description TEXT
  image_url TEXT
  brand VARCHAR(100)
  current_price FLOAT                  -- MIN price across all comparisons

comparison:
  id INT PK AUTO_INCREMENT
  product_id INT FK
  price FLOAT NOT NULL
  url TEXT UNIQUE                      -- product URL from retailer
  name VARCHAR(100)                    -- source name: tgdd, fpt, hoangha
  current_price_at DATETIME            -- last updated
  min_price FLOAT                      -- historical min
  min_price_at DATETIME                -- when min was recorded

wishlist:
  id INT PK
  product_id INT FK
  user_id VARCHAR nullable
  added_at DATETIME

price_alert:
  id INT PK
  product_id INT FK
  user_id VARCHAR nullable
  target_price FLOAT
  current_price FLOAT                  -- price at creation time
  note TEXT
  status ENUM('active','triggered','inactive')
  created_at DATETIME
  triggered_at DATETIME
```

### Quy tắc truy cập data
- ⚠️ LUÔN dùng `database.js` (mysql2 pool) để query — KHÔNG tạo connection mới ở API route
- Crawler dùng `BatchDBProcessor` / `pymysql` — không chia sẻ connection với web app
- `identity_key` là UNIQUE trên `product` — dùng cho insert/update idempotent

---

## Conventions & Rules không được vi phạm

### Code conventions
- **Naming:** camelCase cho biến/hàm (JS), snake_case cho DB columns, PascalCase cho components/classes
- **Import rules:** Dùng `@/*` alias cho absolute import (đã config trong `jsconfig.json`)
- **Client components:** Bắt buộc `"use client"` nếu dùng hooks (useState, useEffect, SWR, axios)
- **Async pattern:** async/await cho API routes và data fetching; AbortController cho cancel request

### Architecture rules
- ⚠️ `pages/api/database.js` là nơi DUY NHẤT được phép tạo MySQL connection pool
- API route KHÔNG được import từ crawler Python và ngược lại
- ProductMatcher STRICT: `brand_norm + model_key + variant_key` phải khớp mới group. Muốn relax → sửa `product_matcher.py`
- `normalizer.py` là single source of truth cho việc trích xuất brand/model/ram/rom/color

### UI/UX rules
- ⚠️ LUÔN dùng `designSystem.js` tokens (`ui.card`, `ui.heading`, `ui.primaryButton`, `cn()`) — KHÔNG hardcode màu/tailwind class dài trong components
- Dark mode: `dark:` prefix Tailwind, `darkMode: "class"` trong config
- Giá tiền: LUÔN dùng `formatPrice()` từ `app/utils/format.js` — format VND với dấu chấm
- Input giá: LUÔN dùng `formatPriceInput()` + `parsePriceInput()` để xử lý dấu chấm/ngăn cách

### Crawler / data conventions
- Spider phải yield `PhoneItem` với đầy đủ trường cơ bản: `source`, `name`, `price`, `product_url`, `image_url`
- Pipeline sẽ tự động chuẩn hóa và xóa các trường không cần thiết
- `BatchDBProcessor` flush theo batch_size (default 500) hoặc khi spider đóng

---

## Tính năng & Trạng thái Module

| Module | Trạng thái | Mô tả ngắn |
|--------|-----------|------------|
| M01 — Product Listing | ✅ Done | /product — phân trang, filter, search |
| M02 — Product Detail + Compare | ✅ Done | /product/[id] — so sánh giá đa nguồn, lịch sử giá |
| M03 — Search | ✅ Done | /search/[term] — tìm kiếm LIKE trên DB |
| M04 — Wishlist | ✅ Done | /wishlist — thêm/xóa, persist DB |
| M05 — Price Alerts | ✅ Done | /alerts — tạo alert, auto-check 5s, triggered modal |
| M06 — Dark Mode | ✅ Done | next-themes, system/default/class |
| M07 — API Documentation | ✅ Done | /api-docs — Swagger UI |
| M08 — Crawler (9 spiders) | ✅ Done | TGDD + FPT + HoangHa × 3 categories |
| M09 — Data Normalization | ✅ Done | normalizer.py + product_matcher.py + pipelines |
| M10 — Docker Compose | ✅ Done | mysql + web + crawler |
| M11 — Price History Chart | 🟡 In Progress | Trang /price-history/[id] tồn tại nhưng chưa rõ độ hoàn thiện |
| M12 — User Auth | ✅ Done | NextAuth v4 + bcryptjs + RBAC 3 role (guest/user/admin) |
| M13 — Relax Variant Matching | ❌ Backlog | ProductMatcher strict đang tách variant ra product riêng. Có thể relax để group theo model_key |
| M14 — OAuth Social Login | ✅ Done | GitHub + Google OAuth qua NextAuth; tự động INSERT user mới, block email conflict với credential account |

### Roadmap ưu tiên tiếp theo
1. **Price History Chart** — hoàn thiện UI biểu đồ giá theo thời gian (trang đã có nhưng cần verify)
2. **Relax ProductMatcher** — cho phép group các variant RAM/ROM khác nhau vào cùng product (nếu PM yêu cầu)
3. **User Authentication** — nếu cần multi-user thực sự

---

## Bug Tracker & Known Issues

### ✅ Đã fix (closed)
| Bug ID | Mô tả | Root cause | Fix ở đâu |
|--------|-------|-----------|-----------|
| BUG-001 | Price alert modal lỗi hiển thị giá | Template literal sai cú pháp trong JSX | `app/product/[id]/page.jsx` — bọc giá trong ngoặc nhọn đúng chuẩn |
| BUG-002 | Wishlist duplicate | Thiếu check UNIQUE constraint | `pages/api/wishlist.js` — manual SELECT trước INSERT |

### 🟡 Đang theo dõi (open)
| Bug ID | Mô tả | Triệu chứng | Hành động tiếp theo |
|--------|-------|------------|-------------------|
| BUG-003 | Product Variant Splitting | Xiaomi 15T Pro 256GB/512GB/1TB tạo thành 3-4 product ID riêng biệt do STRICT variant_key matching | Xem xét relax `ProductMatcher` hoặc thêm `variant_id` column |
| BUG-004 | `checkPriceAlerts.js` và `cronJobs.js` trống | File tồn tại nhưng không có code — có thể là dead code hoặc chưa migrate | Quyết định xóa hoặc di chuyển logic từ `pages/api/price-alert.js` |
| BUG-005 | `lib/` vs `pages/api/` duplicate logic | Cron/alert logic nằm rải rác | Refactor: tách shared business logic vào `lib/` nếu cần |

### ❌ Wontfix / Không ưu tiên
- Hỗ trợ crawl từ Cellphones (cellphones_spider.py tồn tại nhưng chưa active trong crawl_all.py) — lý do: chưa integrate vào pipeline chính

---

## Technical Debt

| Debt | Mô tả | Impact | Hướng fix bền vững |
|------|-------|--------|-------------------|
| DEBT-01 | Mixed App Router + Pages Router | Dễ gây nhầm lẫn khi thêm route mới | Cân nhắc migrate hoàn toàn App Router (Next.js 14 khuyến khích) hoặc giữ nguyên pattern hiện tại và document rõ |
| DEBT-02 | `product` schema không có `variant_id` | Tất cả variant nằm chung, khó query theo cấu hình RAM/ROM | Thêm bảng `product_variant` hoặc cột `variant_summary` nếu cần filter |
| DEBT-03 | Crawler DB connection không qua pool chung | BatchDBProcessor tự tạo connection pymysql | Dùng connection pool hoặc SQLAlchemy nếu scale lên |
| DEBT-04 | No input sanitization trên search query | `pagination.js` dùng `LIKE ?` với `%${q}%` — cần verify chống SQL injection | mysql2 parameterized query đã có, nhưng nên validate `q` length và ký tự đặc biệt |
| DEBT-05 | ✅ Closed | user_id_fk được populate từ session khi login, null khi anonymous |

**Ưu tiên xử lý:** DEBT-04 (security) nếu public-facing, sau đó DEBT-02 nếu cần filter theo variant.

---

## Session Log — Những gì đã làm gần đây

### Session 25/05/2026 — API Service Layer Refactor
**Đã làm:**
- `lib/apiClient.js`: Mở rộng từ 2 hàm thành **12 hàm** bao phủ toàn bộ API — chia nhóm Products / Wishlist / Alerts / Auth
- `app/wishlist/page.js`: Thay 3 axios call hardcode → `getWishlist`, `addToWishlist`, `removeFromWishlist`
- `app/alerts/page.js`: Thay 4 axios call hardcode + SWR URL key → `createAlert`, `updateAlertStatus`, `deleteAlert`, `getAlerts`, `checkTriggeredAlerts`; SWR key đổi thành string mô tả (`"alerts"`, `"alerts-triggers"`)
- `app/product/[id]/page.jsx`: Thay 4 axios call hardcode → `getProductDetail`, `getWishlist`, `addToWishlist`, `removeFromWishlist`, `createAlert`, `getPriceHistory`
- `app/register/page.js`: Thay `axios.post("/api/auth/register")` → `registerUser`
- `components/TrendingDeals.jsx`: Thay `axios.get("/api/product")` → `getProducts`
- `components/MinPriceBox.jsx`: Thay `axios.get("/api/compare")` → `getProductDetail`
- `components/ui/ProductSearch.jsx`: Thay `axios.get("/api/pagination")` → `searchProducts`
- `components/ui/AppSearchBar.jsx`: Thay `axios.get("/api/pagination")` → `searchProducts`
**Kết quả:** Không còn URL `/api/*` hardcode trong bất kỳ component nào. Mọi thay đổi endpoint chỉ cần sửa 1 chỗ trong `apiClient.js`.
**Anti-pattern mới cần tránh:** `❌ KHÔNG` gọi `axios.get("/api/...")` trực tiếp trong component — luôn dùng hàm từ `apiClient.js`.

### Session 21/05/2026 — M14 OAuth Social Login
**Đã làm:**
- `app/login/page.js`: thêm divider + nút "Tiếp tục với GitHub" và "Tiếp tục với Google" với SVG logo
- `lib/auth.js`: import `GithubProvider` + `GoogleProvider`; thêm `signIn()` callback xử lý OAuth flow:
  - Tìm user theo `provider + provider_id` → tái sử dụng account cũ
  - Email conflict với credential user → redirect `/login?error=OAuthEmailConflict` (không merge tự động)
  - Lần đầu login → INSERT user mới với `password_hash = NULL`
  - Provider registration conditional (`&&` guard) — không crash khi env trống
- `.env.local`: generate `NEXTAUTH_SECRET`, set `NEXTAUTH_URL`, điền GitHub credentials
- **Debug:** `GITHUB_CLIENT_ID` nhập nhầm `0v23...` (số 0) thay vì `Ov23...` (chữ O) → GitHub 404

**Cần làm tiếp:** Điền `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` từ Google Cloud Console

**Migration cần chạy:** `mysql/migrations/002_add_oauth.sql` để thêm cột `provider`, `provider_id` vào bảng `users` và cho phép `password_hash = NULL`

### Session 09/05/2026 — M12 User Auth
**Đã làm:** Tích hợp NextAuth v4, bcryptjs, RBAC 3 role, admin panel, seed script
**Phát hiện:** database.js resolve thẳng array (không phải [rows, fields]) — anti-pattern mới
**DEBT-05:** Closed — user_id_fk populate đúng từ session

### Session 06/05/2026 — Khởi tạo CLAUDE.md
**Mục tiêu:** Tạo file overview giúp AI model nắm bắt toàn bộ kiến trúc PriceHawk S4.
**Đã làm:**
- Quét toàn bộ codebase: `package.json`, `README.md`, `DEPLOY.md`, source code, crawler
- Đọc và phân tích: 20+ files JS/JSX/Python/SQL/Docker
- Viết `CLAUDE.md` theo template chuẩn gồm 12 phần
**Kết quả:** File overview hoàn chỉnh, phản ánh chính xác state hiện tại của project.
**Mục tiêu session tiếp theo:** Cập nhật file này sau mỗi lần thay đổi kiến trúc hoặc fix bug quan trọng.

---

## Glossary — Thuật ngữ project

| Thuật ngữ | Nghĩa |
|-----------|-------|
| TGDD | TheGioiDiDong — nhà bán lẻ điện thoại/laptop VN |
| FPT | FPT Shop — nhà bán lẻ điện thoại/laptop VN |
| HoangHa | HoangHaMobile — nhà bán lẻ điện thoại/laptop VN |
| identity_key | Chuỗi duy nhất `brand_model_variant` dùng để merge product giữa các nguồn |
| model_key | Slug của tên model sau khi normalize (vd: `xiaomi-15t-pro`) |
| variant_key | Mô tả cấu hình (vd: `ram-12gb_rom-256gb_color-black`) |
| STRICT matching | ProductMatcher yêu cầu brand+model+variant khớp 100% mới group chung |
| BatchDBProcessor | Lớp Python ghi batch từ crawler vào MySQL với ON DUPLICATE KEY UPDATE |
| SWR | Stale-While-Revalidate — thư viện fetch data tự động revalidate |

---

## ⛔ Anti-patterns — KHÔNG làm những điều này

- ❌ **KHÔNG** gọi `axios.get/post/put/delete("/api/...")` trực tiếp trong component → luôn import hàm từ `lib/apiClient.js`
- ❌ **KHÔNG** dùng `localStorage` để lưu wishlist/alerts → dùng API `/api/wishlist`, `/api/price-alert`
- ❌ **KHÔNG** hardcode tailwind class dài dòng trong JSX → dùng tokens từ `designSystem.js`
- ❌ **KHÔNG** thay đổi `DOWNLOAD_DELAY` hoặc `CONCURRENT_REQUESTS` spider quá cao → dễ bị block IP
- ❌ **KHÔNG** sửa `normalizer.py` mà không test với cả 3 categories (phone, laptop, tablet)
- ❌ **KHÔNG** quên `"use client"` khi dùng React hooks trong `app/` directory
- ❌ **KHÔNG** format giá tiền thủ công → luôn dùng `formatPrice()` từ `app/utils/format.js`
- ❌ **KHÔNG** lấy `userId` từ `req.body` → luôn lấy từ `getServerSession(req, res, authOptions)`
- ❌ **KHÔNG** dùng `const [rows] = await db.query(...)` → `database.js` resolve thẳng array, không phải tuple
- ❌ **KHÔNG** dùng `@/` alias trong `scripts/` → dùng relative path `require("../pages/api/...")`
- ❌ **KHÔNG** dùng `bcrypt` native → `bcryptjs` (lỗi Docker build Alpine)

---

## 📌 Code snippets chuẩn phải dùng

### Pattern gọi API (Centralized Service Layer):
```js
// ✅ ĐÚNG — luôn import hàm có tên từ apiClient, KHÔNG gọi axios trực tiếp
import { getProducts, searchProducts } from "@/lib/apiClient";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/apiClient";
import { getAlerts, createAlert, deleteAlert } from "@/lib/apiClient";
import { getProductDetail, getPriceHistory } from "@/lib/apiClient";

// Dùng AbortController để cancel request khi unmount
const controller = new AbortController();
const res = isSearchMode
  ? await searchProducts(q, page, pageSize, controller.signal)
  : await getProducts(page, pageSize, controller.signal);

// ❌ SAI — KHÔNG hardcode URL axios trong component
// const res = await axios.get("/api/product", { params: { page, pageSize } });
```

### Pattern SWR với apiClient:
```js
import { getAlerts, checkTriggeredAlerts } from "@/lib/apiClient";
import useSWR, { mutate } from "swr";

// Fetcher dùng hàm có tên, key SWR là string mô tả (không phải URL)
const alertsFetcher = () => getAlerts().then(res => res.data);
const { data } = useSWR("alerts", alertsFetcher, { refreshInterval: 5000 });

// Revalidate bằng key string, không phải URL
mutate("alerts");
```

### Pattern query DB trong API route:
```js
import db from "./database"; // relative from pages/api/
const result = await db.query("SELECT * FROM product WHERE name LIKE ? LIMIT ? OFFSET ?", [`%${q}%`, limit, offset]);
```

### Pattern format giá VND:
```js
import { formatPrice, formatPriceInput, parsePriceInput } from "@/app/utils/format";
// Hiển thị: formatPrice(17190000) // "17.190.000 ₫"
// Input: formatPriceInput("1234567") // "1.234.567"
// Parse: parsePriceInput("1.234.567") // 1234567
```

### Pattern UI tokens:
```js
import { cn, ui } from "@/components/ui/designSystem";
// Dùng: <div className={cn(ui.card, "p-6")}>...</div>
```

---

## 🔧 Quirks theo môi trường

### Docker quirks
- MySQL container expose `3307:3306` — kết nối DB từ host Windows phải dùng port `3307`
- Crawler container chạy cron, không phải daemon — log ra `/app/price-hawk/logs/cron.log`
- `.env_product` cho web, `./price-hawk/.env_product` cho crawler — có thể khác nhau

### Next.js quirks
- App Router (`app/`) và Pages Router (`pages/api/`) coexist — thêm route mới cần biết đặt đúng chỗ
- `next.config.js` đã whitelist các domain ảnh — thêm retailer mới phải thêm vào `images.domains`
- `metadata` export trong `app/layout.js` — dùng cho SEO

### Windows quirks
- Path separator: code JS dùng `/` thông thường (Next.js/Vite handle); Python dùng `pathlib` hoặc `os.path.join()`
- `package-lock.json` có thể lock với Windows dependencies — chạy `npm install` trên Linux container thì Docker handle

---

## 🤖 Trạng thái AI Models (cập nhật thường xuyên)

| Task | Model hiện tại | Token limit | Lưu ý |
|------|---------------|------------|-------|
| Code review / refactor | Claude / Cascade | 64k | Dùng context từ CLAUDE.md này |
| Không có external AI API nào được gọi từ code | N/A | N/A | Crawler dùng regex + heuristic, không dùng LLM |

---

## 📊 Metrics hiện tại

| Chỉ số | Giá trị hiện tại | Mục tiêu | Trạng thái |
|--------|-----------------|---------|-----------|
| Total Products | ~1,413 | Scale theo số nguồn | ✅ |
| Total Comparisons | ~1,409 | ~1 product ≈ 1 comparison | ✅ |
| Crawl Cycle | 5 phút | < 5 phút | ✅ |
| Database Duplicate Rate | 0% | 0% | ✅ |
| Active Spiders | 9 | 9+ | ✅ |

---

## 🔗 Dependency Map

```
App UI (app/, components/)
    ↓ axios / fetch
lib/apiClient.js
    ↓ GET/POST/DELETE
pages/api/*.js
    ↓ import
pages/api/database.js
    ↓ mysql2 pool
MySQL (pricecomparison)
    ↑ pymysql
price-hawk/ (Scrapy crawler)
    → BatchDBProcessor → ProductMatcher → normalizer
```

**Không được tạo circular dependency:**
- `database.js` KHÔNG import từ bất kỳ page/component nào
- Crawler Python KHÔNG import từ JS/Next.js
- `normalizer.py` là pure function — không phụ thuộc DB hoặc spider state

---

## ✅ Checklist trước khi nói "Done"

- [ ] Đã test trên môi trường dev thực tế (`npm run dev` + MySQL running)
- [ ] Crawler hoạt động: `python crawl_all.py` không lỗi, data vào DB
- [ ] API route trả về JSON đúng định dạng (dùng `/api-docs` hoặc Swagger để verify)
- [ ] Data được persist đúng storage key / DB table
- [ ] Không có console.error trong happy path
- [ ] UI không bị block khi async operation đang chạy (loading skeleton hiển thị)
- [ ] Dark mode hiển thị đúng trên cả light và dark
- [ ] Giá tiền format đúng VND với `formatPrice()`

---

> **Rule vàng:** File overview stale còn hại hơn không có file — AI sẽ làm theo thông tin cũ và break những gì đã fix.
>
> **Sau mỗi session làm việc, cập nhật:**
> 1. Dòng "Cập nhật lần cuối" ở header
> 2. Trạng thái module trong Phần 8 (Done / In Progress / Backlog)
> 3. Bug tracker trong Phần 9 (close bug đã fix, thêm bug mới)
> 4. Technical debt trong Phần 10
> 5. Thêm entry vào Session Log (Phần 11)
> 6. Cập nhật metrics nếu có thay đổi (Phần 6 trong Gợi ý)
