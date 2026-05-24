"""
main.py — FastAPI entrypoint cho PriceHawk Chatbot Service.

Chạy: uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pipeline import ChatbotPipeline


# ── Shared pipeline instance ─────────────────────────────────────────────────
pipeline: ChatbotPipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi tạo pipeline khi server start."""
    global pipeline
    print("[Server] Starting PriceHawk Chatbot Service...")
    pipeline = ChatbotPipeline()
    print("[Server] Ready to serve requests.")
    yield
    print("[Server] Shutting down.")


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="PriceHawk Chatbot API",
    description="AI Chatbot for PriceHawk price comparison website",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: Cho phép Next.js frontend gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str   # "user" hoặc "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ProductPrice(BaseModel):
    retailer: str
    price: float | None
    url: str | None


class ProductInfo(BaseModel):
    id: int | None = None
    name: str
    image_url: str | None = None
    category: str | None = None
    prices: list[ProductPrice] = []


class ChatResponse(BaseModel):
    reply: str
    source: str                     # "database" | "internet" | "system" | "not_found"
    products: list[ProductPrice] = []
    intent: str | None = None
    search_keyword: str | None = None
    latency_ms: float | None = None


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
async def health_check():
    """Health check endpoint."""
    db_ok = False
    try:
        import db as database
        db_ok = database.is_db_available()
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "PriceHawk Chatbot",
        "db_connected": db_ok,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint.

    Input:  { "message": "iPhone 15 giá bao nhiêu?", "history": [...] }
    Output: { "reply": "...", "source": "database", "products": [...] }
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")

    history = [{"role": m.role, "content": m.content} for m in request.history]

    result = await pipeline.run(request.message.strip(), history)

    # Flatten products list để match response model
    flat_products = []
    for product in result.get("products", []):
        for price_info in product.get("prices", []):
            flat_products.append({
                "retailer": price_info.get("retailer", ""),
                "price": price_info.get("price"),
                "url": price_info.get("url"),
            })

    return ChatResponse(
        reply=result.get("reply", ""),
        source=result.get("source", "system"),
        products=flat_products,
        intent=result.get("intent"),
        search_keyword=result.get("search_keyword"),
        latency_ms=result.get("latency_ms"),
    )
