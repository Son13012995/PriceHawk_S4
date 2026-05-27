# PriceHawk AI Chatbot 🦅

Module chatbot AI tách biệt cho PriceHawk — hoạt động theo kiến trúc **Agentic-RAG**.

## Kiến trúc

```
User Query
    ↓
[Agent 1] IntentAgent  — Phân tích intent + tên sản phẩm (Groq Llama 3.3 70B)
    ↓
[Agent 2] DBAgent      — Tìm kiếm trong MySQL (exact → partial match)
    ↓ (nếu DB không có hoặc partial match)
[Agent 3] InternetAgent — SearxNG search → Crawl4AI → LLM summarize
    ↓
[Agent 4] ResponderAgent — Tạo câu trả lời tiếng Việt (Markdown)
```

---

## Cài đặt (Local Dev)

### 1. Tạo môi trường Python

```bash
cd chatbot
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

### 2. Cài dependencies

```bash
pip install -r requirements.txt

# Crawl4AI cần setup thêm lần đầu
crawl4ai-setup
```

### 3. Tạo file `.env`

```bash
cp .env.example .env
```

Rồi điền vào `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here   # https://console.groq.com (miễn phí)
DB_HOST=127.0.0.1
DB_PORT=3307           # Docker expose MySQL ra port 3307
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=pricecomparison
SEARXNG_URL=http://localhost:8080
```

### 4. Đảm bảo Docker MySQL và SearxNG đang chạy

```bash
# Từ thư mục gốc PriceHawk_S4
docker compose up -d mysql searxng
```

### 5. Chạy Chatbot Service

```bash
cd chatbot
uvicorn main:app --reload --port 8000
```

Kiểm tra service: http://localhost:8000

---

## Chạy qua Docker Compose (Khuyến nghị)

```bash
# Từ thư mục gốc PriceHawk_S4
cp chatbot/.env.docker.example chatbot/.env.docker
# Điền GROQ_API_KEY vào chatbot/.env.docker

docker compose up -d --build chatbot
```

---

## Chạy cùng Next.js

Thêm vào `.env` của Next.js (file `.env` gốc):
```env
CHATBOT_SERVICE_URL=http://localhost:8000
```

Chạy Next.js bình thường:
```bash
npm run dev
```

Chat widget 🦅 sẽ xuất hiện ở góc phải dưới màn hình trên mọi trang.

---

## Test nhanh API

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "iPhone 16 128GB giá bao nhiêu?"}'
```

---

## Cấu trúc thư mục

```
chatbot/
├── .env.example           # Template biến môi trường (local dev)
├── .env.docker.example    # Template biến môi trường (Docker)
├── requirements.txt       # Python dependencies
├── main.py                # FastAPI entrypoint (port 8000)
├── pipeline.py            # Orchestrator điều phối 4 agents
├── db.py                  # Kết nối MySQL + search utils
└── agents/
    ├── intent_agent.py    # Agent 1: Phân tích intent + entity (Groq)
    ├── db_agent.py        # Agent 2: Tìm trong MySQL
    ├── internet_agent.py  # Agent 3: SearxNG + Crawl4AI fallback
    └── responder_agent.py # Agent 4: Tạo câu trả lời tiếng Việt
```

---

## Categories hỗ trợ

Chatbot tìm kiếm toàn bộ DB, hỗ trợ đúng theo các spider đã có:
- **Điện thoại**: TGDD, FPT Shop, Hoàng Hà Mobile
- **Laptop**: TGDD, FPT Shop, Hoàng Hà Mobile
- **Tablet**: TGDD, FPT Shop, Hoàng Hà Mobile

---

## Tài liệu chi tiết

Xem file `chatbot.MD` ở thư mục gốc để hiểu toàn bộ luồng hoạt động,
edge cases, retry logic và cách debug logs.
