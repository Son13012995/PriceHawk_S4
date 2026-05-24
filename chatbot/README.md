# PriceHawk AI Chatbot 🦅

Module chatbot AI tách biệt cho PriceHawk — hoạt động theo kiến trúc **Agentic-RAG**.

## Kiến trúc

```
User Query
    ↓
[Agent 1] Intent + Entity Detection (Gemini Flash)
    ↓
[Agent 2] MySQL DB Search (search toàn bộ: điện thoại / laptop / tablet)
    ↓ (nếu DB trống)
[Agent 3] Internet Fallback: DuckDuckGo → LLM chọn URL → Crawl4AI → Summarize
    ↓
[Agent 4] Responder: Tạo câu trả lời tiếng Việt
```

## Cài đặt

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
GOOGLE_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_PORT=3307           # Docker expose port 3307
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=pricecomparison
```

> **Lấy Gemini API Key miễn phí:** https://aistudio.google.com/app/apikey

### 4. Đảm bảo Docker MySQL đang chạy

```bash
# Từ thư mục gốc PriceHawk_S4
docker-compose up -d mysql
```

### 5. Chạy Chatbot Service

```bash
cd chatbot
uvicorn main:app --reload --port 8000
```

Kiểm tra service: http://localhost:8000

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
  -d '{"message": "iPhone 15 Pro Max 256GB giá bao nhiêu?"}'
```

---

## Cấu trúc thư mục

```
chatbot/
├── .env.example          # Template biến môi trường
├── requirements.txt      # Python dependencies
├── main.py               # FastAPI entrypoint (port 8000)
├── pipeline.py           # Orchestrator 4 agents
├── db.py                 # Kết nối MySQL + search utils
└── agents/
    ├── intent_agent.py   # Agent 1: Phân tích intent + entity
    ├── db_agent.py       # Agent 2: Tìm trong MySQL
    ├── internet_agent.py # Agent 3: DDG + Crawl4AI fallback
    └── responder_agent.py# Agent 4: Tạo câu trả lời tiếng Việt
```

## Categories hỗ trợ

Chatbot tìm kiếm toàn bộ DB, hỗ trợ đúng theo các spider đã có:
- **Điện thoại** (`dien-thoai`): TGDD, FPT Shop, Hoàng Hà Mobile
- **Laptop** (`laptop`, `may-tinh-xach-tay`): TGDD, FPT Shop, Hoàng Hà Mobile
- **Tablet** (`tablet`, `may-tinh-bang`): TGDD, FPT Shop, Hoàng Hà Mobile
