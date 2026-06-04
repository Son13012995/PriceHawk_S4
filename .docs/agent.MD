# 🤖 PriceHawk Chatbot — Tài liệu Agentic-RAG Pipeline

> Tài liệu này mô tả kiến trúc, luồng xử lý và cơ chế hoạt động của hệ thống chatbot AI trong PriceHawk.

---

## 1. Tổng quan kiến trúc

Chatbot sử dụng kiến trúc **Agentic-RAG** (Retrieval-Augmented Generation với nhiều Agent độc lập), gồm **4 Agent** phối hợp theo pipeline tuần tự.

```
Câu hỏi từ User
       │
       ▼
┌──────────────────┐
│  Agent 1         │  ← Groq Llama 3.3 70B
│  IntentAgent     │  Phân tích intent + trích xuất tên sản phẩm
└────────┬─────────┘
         │
   irrelevant / out_of_scope?
         │ Không                     │ Có → Trả lời cố định, dừng luôn
         ▼
┌──────────────────┐
│  Agent 2         │  ← MeiliSearch (fuzzy) → MySQL (prices)
│  DBAgent         │  Tìm kiếm trong cơ sở dữ liệu
└────────┬─────────┘
         │
   exact match?
         │ Có → ResponderAgent, xong
         │ Không (partial / miss)
         ▼
┌──────────────────┐
│  Agent 3         │  ← SearxNG + Crawl4AI + Groq
│  InternetAgent   │  Tìm kiếm Internet làm fallback
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Agent 4         │  ← Groq Llama 3.3 70B
│  ResponderAgent  │  Tổng hợp → câu trả lời tiếng Việt
└──────────────────┘
```

**Tech stack của pipeline:**
| Thành phần | Công nghệ |
|---|---|
| LLM chính | Groq Llama 3.3 70B Versatile |
| LLM dự phòng | Groq Llama 3.1 8B Instant |
| Search Index | MeiliSearch v1.13 (fuzzy, typo-tolerant) |
| Database | MySQL (source of truth — giá + thông tin SP) |
| Internet Search | SearxNG (self-hosted) |
| Web Crawling | Crawl4AI (Playwright-based) |
| API Server | FastAPI (Python) |

---

## 2. Luồng xử lý chung (Pipeline Flow)

### 2.1 Luồng Happy Path — Sản phẩm có trong DB

```
User: "iPhone 16 128GB giá bao nhiêu?"
  │
  ├─ IntentAgent   → intent=price_query, product="iPhone 16 128GB"   (~500ms)
  ├─ DBAgent       → MeiliSearch search → score=0.98 → EXACT         (~10ms)
  │                   → fetch prices từ MySQL                         (~80ms)
  ├─ InternetAgent → BỎ QUA
  └─ ResponderAgent → Format bảng giá + link Markdown                (~1.5s)

Tổng latency: ~2s
```

### 2.2 Luồng Fallback — Sản phẩm KHÔNG có trong DB

```
User: "Viettel Sumo T2 4G giá bao nhiêu?"
  │
  ├─ IntentAgent → intent=price_query, product="Viettel Sumo T2"     (~500ms)
  ├─ DBAgent     → Không tìm thấy → DB miss                          (~100ms)
  ├─ InternetAgent → SearxNG search → Crawl4AI crawl TGDD → tóm tắt (~8-12s)
  └─ ResponderAgent → Câu trả lời từ Internet + nguồn                (~1.5s)

Tổng latency: ~10-14s
```

### 2.3 Luồng Partial Match

```
User: "Samsung A16"  (DB có "Samsung Galaxy A16")
  │
  ├─ IntentAgent → product="Samsung A16"
  ├─ DBAgent     → score=0.875 → EXACT (vì overlap = 2/2 = 1.0)
  └─ ResponderAgent → Trả về kết quả DB bình thường

  --- Hoặc nếu score chỉ đạt 0.6-0.85: ---

  ├─ DBAgent     → score=0.72 → PARTIAL match
  ├─ InternetAgent → Thử tìm Internet trước để chính xác hơn
  │   ├─ Có → Dùng kết quả Internet
  │   └─ Không → Dùng kết quả DB partial + DISCLAIMER
  └─ ResponderAgent → "Xin lỗi, không tìm thấy chính xác, đây là SP tương tự..."
```

### 2.4 Luồng Câu hỏi không liên quan

```
User: "Thời tiết hôm nay thế nào?"
  │
  ├─ IntentAgent → intent=irrelevant
  └─ Pipeline DỪNG ngay → reply_irrelevant() (~0.5s, không gọi LLM nữa)

User: "Sửa màn hình iPhone ở đâu?"
  │
  ├─ IntentAgent → intent=out_of_scope
  └─ Pipeline DỪNG ngay → reply_out_of_scope() (~0.5s)
```

---

## 3. Chi tiết từng Agent

---

### 🔍 Agent 1: IntentAgent

**File:** `agents/intent_agent.py`

**Nhiệm vụ:** Nhận câu hỏi thô từ user → gọi LLM → phân tích và trả về JSON chuẩn hóa.

**Input:**
```
user_message = "So sánh iPhone 16 và Samsung S25 cái nào tốt hơn?"
history      = [{"role": "user", "content": "..."}, ...]  # 2 lượt gần nhất
```

**Output:**
```json
{
  "intent": "compare",
  "product_name": "iPhone 16",
  "product_name_2": "Samsung Galaxy S25",
  "brand": "Apple",
  "category": "dien-thoai"
}
```

#### 3.1 Các loại Intent

| Intent | Mô tả | Ví dụ câu hỏi |
|---|---|---|
| `price_query` | Hỏi giá, nơi mua, cửa hàng rẻ nhất | "iPhone 16 giá bao nhiêu?" "Mua Samsung A55 ở đâu rẻ?" |
| `compare` | So sánh 2+ sản phẩm | "So sánh iPhone 16 và Galaxy S25" "Pixel 9 hay iPhone 16 tốt hơn?" |
| `review_query` | Hỏi thông số, đánh giá, nên mua không | "iPhone 16 có tốt không?" "RAM Dell XPS 15 là bao nhiêu?" |
| `out_of_scope` | Liên quan công nghệ nhưng ngoài khả năng | "Sửa màn hình ở đâu?" "Cách cài app?" "Phụ kiện S25?" |
| `irrelevant` | Hoàn toàn không liên quan điện tử | "Thời tiết hôm nay?" "Messi là ai?" "Nấu phở thế nào?" |

#### 3.2 Cơ chế Fallback khi LLM lỗi

```
Groq Llama 3.3 70B  →  Rate limit 429?
        │ Có
        ▼
Groq Llama 3.1 8B  →  Cũng lỗi?
        │ Có
        ▼
Regex Fallback: xóa các từ hỏi tiếng Việt khỏi câu
"iPhone 16 giá bao nhiêu rẻ nhất?" → "iPhone 16"
```

Danh sách từ bị xóa: `"giá bao nhiêu"`, `"bao nhiêu tiền"`, `"review"`, `"đánh giá"`, `"nên mua không"`, `"có tốt không"`, `"mua ở đâu"`, `"rẻ nhất"`, `"tốt nhất"`, `"giá"`, `"mua"`...

> **Kết quả:** Pipeline không bao giờ crash dù LLM hoàn toàn chết.

---

### 🗄️ Agent 2: DBAgent

**File:** `agents/db_agent.py` + `chatbot/meili_client.py` + `db.py`

**Nhiệm vụ:** Tìm sản phẩm trong MeiliSearch (nhanh, fuzzy), sau đó fetch giá đầy đủ từ MySQL.

**Input:**
```
product_name = "Samsung A55"
category     = "dien-thoai"   # hoặc "laptop" | "tablet" | None
```

**Output:**
```json
{
  "found": true,
  "match_type": "exact",
  "products": [
    {
      "id": 42,
      "name": "Samsung Galaxy A55 5G",
      "brand": "Samsung",
      "prices": [
        {"retailer": "tgdd",    "price": 8990000, "url": "https://..."},
        {"retailer": "fpt",     "price": 9190000, "url": "https://..."},
        {"retailer": "hoangha", "price": 9290000, "url": "https://..."}
      ]
    }
  ]
}
```

#### 3.3 Cơ chế tìm kiếm — 2 bước (MeiliSearch → MySQL)

**Bước 1: MeiliSearch Search (Primary)**
```
keyword = "Samsung A55"
  → POST /indexes/products/search
    { "q": "Samsung A55", "limit": 10, "showRankingScore": true }
  → Trả về: hits[] với _rankingScore mỗi hit

Kiểm tra top score:
  ≥ 0.95 → EXACT   → Lấy product_ids, fetch prices từ MySQL
  < 0.95 → PARTIAL → Lấy product_ids, fetch prices từ MySQL
            (pipeline sẽ thử Internet để xác nhận thêm)
```

MeiliSearch có typo tolerance — tự xử lý lỗi chính tả nhẹ:
```
"Samsng A55" → vẫn tìm được "Samsung Galaxy A55 5G" ✅
"iphone 16"  → tìm được "Apple iPhone 16 128GB"      ✅
```

**Bước 2: Fallback MySQL LIKE Search (nếu MeiliSearch miss)**
```sql
SELECT p.id, p.name, p.brand, c.name AS retailer, c.price, c.url
FROM product p
JOIN comparison c ON p.id = c.product_id
WHERE p.name LIKE '%Samsung A55%'
ORDER BY c.price ASC
LIMIT 50
```
→ Áp dụng Similarity Scoring trên kết quả (xem chi tiết bên dưới).

> **Lưu ý:** MySQL LIKE là fallback — chỉ chạy khi MeiliSearch không trả về kết quả (service down hoặc không có hit).

#### 3.4 Ranking Score MeiliSearch vs Similarity Score MySQL

| Nguồn | Cơ chế | Ngưỡng phân loại |
|---|---|---|
| **MeiliSearch** | `_rankingScore` (0→1) | ≥ 0.95 = exact; < 0.95 = partial |
| **MySQL fallback** | `(SequenceMatcher × 0.4) + (word_overlap × 0.6)` | ≥ 0.85 = exact; ≥ 0.60 = partial; < 0.60 = miss |

#### 3.5 Ví dụ MeiliSearch Ranking Score

```
Query:  "samsung a55"
Top hit: "Samsung Galaxy A55 5G"  _rankingScore = 0.97 → EXACT ✅

Query:  "samsung a16"
Top hit: "Samsung Galaxy A55 5G"  _rankingScore = 0.62 → PARTIAL
  → Pipeline thử Internet để verify trước

Query:  "xiaomi redmi note 50"
No hits → Fallback MySQL LIKE
```

#### 3.6 Ví dụ Similarity Score (MySQL fallback)

**Ví dụ — EXACT (score = 0.875) — Thiếu từ "Galaxy"**
```
Query:  "Samsung A55"
DB:     "Samsung Galaxy A55 5G"

Word overlap:
  q_words  = {samsung, a55}                   (2 từ)
  t_words  = {samsung, galaxy, a55, 5g}       (4 từ)
  giao nhau = {samsung, a55} = 2 từ
  overlap  = 2/2 = 1.0

SCORE = (SequenceMatcher × 0.4) + (1.0 × 0.6) = 0.875
→ 0.875 ≥ 0.85 → EXACT ✅
```

**Ví dụ — NOT FOUND (score = 0.45) — Sai phiên bản**
```
Query:  "Samsung A55 5G"
DB:     "Samsung Galaxy A56"

Word overlap:
  giao nhau = {samsung} = 1 từ  ← A55 ≠ A56
  overlap  = 1/3 ≈ 0.333

SCORE ≈ 0.450
→ 0.450 < 0.60 → NOT FOUND → Chuyển Internet ❌
```

#### 3.7 MeiliSearch Index Configuration

```
Index name:  products
Primary key: id
Searchable:  name, brand, identity_key
Filterable:  brand
Sortable:    current_price
Typo tolerance:
  - 1 lỗi: từ ≥ 3 ký tự
  - 2 lỗi: từ ≥ 5 ký tự
```

**Dữ liệu được index:**
- Tự động khi Crawler lưu sản phẩm mới (trong `db_batch_processor.py`)
- Backfill một lần duy nhất khi mới setup: `python price-hawk/scripts/index_existing.py`
- Hoặc tự động qua `run_crawler.sh` nếu index đang trống

---

### 🌐 Agent 3: InternetAgent

**File:** `agents/internet_agent.py`

**Nhiệm vụ:** Tìm kiếm thông tin sản phẩm trên Internet khi DB không có. Gồm 4 bước nội bộ.

**Khi nào được gọi:**
- DBAgent trả về `match_type = partial` → thử Internet trước
- DBAgent trả về `found = False` → hoàn toàn dùng Internet

**Luồng nội bộ:**
```
keyword = "Viettel Sumo T2"
    │
    ▼
Bước 1: SearxNG Search
  GET http://searxng:8080/search
      ?q=Viettel Sumo T2 giá thông số đánh giá Việt Nam
      &format=json
  → Trả về: [url1, url2, url3, url4, url5]
    │
    ▼
Bước 2: Chọn URL tốt nhất
  Ưu tiên theo domain:
    1. thegioididong.com
    2. fptshop.com.vn
    3. hoanghamobile.com
    4. cellphones.com.vn
    5. tinhte.vn, genk.vn, websosanh.vn
  → Fallback: url đầu tiên trong danh sách
    │
    ▼
Bước 3: Crawl4AI crawl trang web
  AsyncWebCrawler().arun(url, config)
  Config: word_count_threshold=50, exclude_external_links=True
  → Trả về: Markdown của trang (tối đa 5000 ký tự)
    │
    ▼
Bước 4: Groq tóm tắt
  Prompt: "Tóm tắt thông tin về '{keyword}' từ nội dung sau...
           Tập trung: giá, thông số kỹ thuật, ưu/nhược điểm (≤300 từ)"
  → summary text
```

**Tại sao dùng SearxNG thay vì gọi Google trực tiếp?**

| | Google/Bing API | SearxNG |
|---|---|---|
| Chi phí | $5/1000 queries | **Miễn phí** |
| Rate limit | Có | Không (self-hosted) |
| Setup | Cần đăng ký | Docker container |
| Kết quả | Google chính thức | Tổng hợp Google + Bing + DDG |

**Retry logic:**
```python
for attempt in range(3):      # Thử tối đa 3 lần
    response = GET searxng...
    if results: return results
    await asyncio.sleep(2)     # Chờ 2s giữa các lần retry
return []                      # Không có → InternetAgent fail → DB partial fallback
```

---

### 💬 Agent 4: ResponderAgent

**File:** `agents/responder_agent.py`

**Nhiệm vụ:** Nhận dữ liệu từ DB hoặc Internet → gọi Groq → tạo câu trả lời tiếng Việt thân thiện, có Markdown.

**Có 5 chế độ trả lời:**

#### Chế độ 1: Từ DB — Hỏi giá thông thường
```
Prompt → Groq:
  "Người dùng hỏi: '{user_message}'
   Thông tin giá:
     [SP 1] iPhone 16 128GB
       - FPT Shop: 22.990.000đ (url)
       - TGDD: 22.990.000đ (url)
   Viết câu trả lời tiếng Việt, gồm:
   1. Tóm tắt sản phẩm
   2. Bảng giá các cửa hàng (link Markdown: [Tên](url))
   3. Gợi ý cửa hàng rẻ nhất"
```

#### Chế độ 2: Từ DB — So sánh (intent=compare)
```
Prompt → Groq:
  "... Trình bày SO SÁNH dạng DANH SÁCH (không dùng bảng)
   Mỗi SP: in đậm tên, gạch đầu dòng: Giá, RAM, Camera, Pin, Chipset
   Giá: BẮT BUỘC lấy từ dữ liệu hệ thống
   Thông số: dùng kiến thức nội tại của LLM (nếu DB không có)
   Sau cùng: 2-3 dòng nhận xét ngắn"
```

#### Chế độ 3: Từ Internet
```
Prompt → Groq:
  "Thông tin từ internet (nguồn: {url}):
   {summary}
   Viết câu trả lời tiếng Việt thân thiện.
   Ghi rõ nguồn: [Nguồn tham khảo](url)"
```

#### Chế độ 4: Partial fallback (DB có kết quả tương tự, không chính xác)
```
Thêm vào prompt:
  "LƯỚI Ý: Hệ thống KHÔNG tìm thấy chính xác '{keyword}'.
   Hãy XIN LỖI, sau đó đề xuất các SP tương tự."
→ Câu trả lời: "Xin lỗi, mình không tìm thấy chính xác..., đây là các SP tương tự..."
```

#### Chế độ 5: Không tìm thấy / Irrelevant / Out of scope
```python
# Trả về text cố định, KHÔNG gọi LLM → tiết kiệm API call
reply_irrelevant()    → "Mình là trợ lý so sánh giá PriceHawk 🦅..."
reply_out_of_scope()  → "Câu hỏi nằm ngoài phạm vi mình hỗ trợ..."
reply_not_found()     → "Xin lỗi, không tìm thấy '{keyword}'... Thử tại TGDD, FPT..."
```

---

## 4. So sánh 5 kịch bản thực tế

| Kịch bản | User hỏi | IntentAgent | DBAgent | InternetAgent | Latency |
|---|---|---|---|---|---|
| **Happy path** | "iPhone 16 giá?" | price_query | EXACT | Bỏ qua | ~2s |
| **So sánh** | "iPhone 16 vs S25" | compare | 2 EXACT | Bỏ qua | ~3s |
| **Partial → Internet** | "Samsung A16" (DB: "Galaxy A16") | price_query | PARTIAL | Gọi → có kết quả | ~8s |
| **Không có trong DB** | "Viettel Sumo T2" | price_query | MISS | Gọi → có kết quả | ~10-14s |
| **Không liên quan** | "Thời tiết hôm nay?" | irrelevant | Bỏ qua | Bỏ qua | ~0.5s |

---

## 5. Độ trễ và tối ưu

```
Agent 1 (IntentAgent)   : ~300-700ms   — Groq API call
                          ~0ms          — Fast-path keyword (irrelevant rõ ràng)
Agent 2 (DBAgent)       : ~5-15ms      — MeiliSearch search
                          ~80-150ms     — MySQL fetch prices
Agent 3 (InternetAgent) : ~5-12s       — SearxNG + Crawl4AI (chậm nhất)
Agent 4 (ResponderAgent): ~1-2s        — Groq API call

Tổng:
  DB EXACT (1 SP)    → ~2s      (Agent 3 bỏ qua)
  DB EXACT (compare) → ~3-5s    (2 DB query song song qua asyncio.gather)
  Internet hit       → ~10-30s  (cả 4 agent chạy)
  Irrelevant rõ      → ~0ms     (fast-path keyword check, không gọi LLM)
  Irrelevant mờ      → ~0.5s    (LLM classify)
```

**Bottleneck chính:** Crawl4AI (Agent 3) vì phải chạy Playwright headless browser để render JavaScript. Có timeout 20s — nếu vượt quá sẽ dùng SearxNG snippet trực tiếp làm fallback.

---

## 6. Khả năng chịu lỗi (Fault Tolerance)

| Sự cố | Cơ chế xử lý |
|---|---|
| Groq rate limit (429) | Tự động chuyển sang model nhỏ `llama-3.1-8b-instant` |
| MySQL không kết nối được | `is_db_available()` check khi khởi động → bỏ qua DBAgent, chuyển thẳng Internet |
| MeiliSearch down/không phản hồi | Timeout 5s → tự động fallback MySQL LIKE search, chatbot hoạt động bình thường |
| SearxNG timeout | Retry 3 lần, mỗi lần cách 2s → Nếu vẫn fail, dùng DB partial |
| Crawl4AI crawl treo | Timeout 20s → dùng SearxNG snippets làm nội dung tóm tắt thay thế |
| Crawl4AI crash hoàn toàn | Catch exception → InternetAgent trả về `found=False` → DB partial fallback |

> **Nguyên tắc thiết kế:** Không bao giờ trả về HTTP 500 cho user. Mọi lỗi đều được xử lý và trả về câu trả lời mặc định có ý nghĩa.
