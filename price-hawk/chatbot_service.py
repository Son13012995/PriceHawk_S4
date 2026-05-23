#!/usr/bin/env python3
"""
FastAPI Chatbot Service
- Runs on port 8000
- Integrates with MySQL database to query products
- Falls back to SearXNG for web search if DB has no results
- Can be extended with LLM APIs (OpenAI, Gemini, etc)

Run: python chatbot_service.py
Or with uvicorn: uvicorn chatbot_service:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import re
import asyncio
from typing import Optional, List
from datetime import datetime
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pymysql
from dotenv import load_dotenv

# Import search client for web fallback
try:
    from search_cli import search_web
    SEARCH_AVAILABLE = True
except ImportError:
    SEARCH_AVAILABLE = False
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning("search_cli not available - web search fallback disabled")

# ──── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Minimum relevance score to accept DB matches.
MIN_DB_SCORE = 18

# ──── FastAPI App ────────────────────────────────────────────────────────────
app = FastAPI(title="PriceHawk Chatbot Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──── Database Connection ────────────────────────────────────────────────────
def get_db_connection():
    """Create MySQL connection"""
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "pricecomparison"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        charset="utf8mb4"
    )

# ──── Models ─────────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    reply: str
    source: str  # "database", "internet", "system"

# ──── Product Search ────────────────────────────────────────────────────────
def search_products(keyword: str, limit: int = 20) -> List[dict]:
    """Search products from database by name or brand"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT id, name, brand, current_price, identity_key
            FROM product
            WHERE name LIKE %s OR brand LIKE %s
            LIMIT %s
        """
        cursor.execute(query, (f"%{keyword}%", f"%{keyword}%", limit))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        products = []
        for row in results:
            products.append({
                "id": row[0],
                "name": row[1],
                "brand": row[2],
                "price": row[3],
                "identity_key": row[4]
            })
        return products
    except Exception as e:
        logger.error(f"Database search error: {e}")
        return []


def tokenize_for_match(text: str) -> List[str]:
    """Tokenize text for search relevance scoring."""
    normalized = re.sub(r"[^\w\s]", " ", (text or "").lower())
    words = normalized.split()
    stop_words = {
        "tôi", "muốn", "tìm", "thông", "tin", "về", "máy", "tính", "bảng", "điện", "thoại",
        "là", "cái", "chiếc", "bao", "nhiêu", "giá", "nào", "này", "kia", "có", "không", "và",
        "hay", "gì", "cho", "mình", "em", "anh", "chị", "ơi", "ạ", "với"
    }
    return [w for w in words if len(w) >= 2 and w not in stop_words]


def score_product_match(product: dict, query: str) -> int:
    """Score how well a product matches query; higher is better."""
    name = (product.get("name") or "").lower()
    brand = (product.get("brand") or "").lower()
    full_text = f"{name} {brand}".strip()

    query_tokens = tokenize_for_match(query)
    score = 0

    # Token overlap
    for token in query_tokens:
        if token in full_text:
            score += 8

    # Reward exact phrase containment (strong signal)
    if query.strip() and query.lower() in full_text:
        score += 20

    # Prefer rows with actual price
    if isinstance(product.get("price"), (int, float)):
        score += 10

    # Boost product-like names
    product_terms = ["máy tính bảng", "điện thoại", "laptop", "tablet", "pad", "tab"]
    if any(term in name for term in product_terms):
        score += 6

    # Penalize news/promo-like records
    noisy_terms = ["đăng ký", "ra mắt", "quà", "cơ hội", "trị giá", "flagship"]
    if any(term in name for term in noisy_terms):
        score -= 10

    return score


def rerank_products(products: List[dict], query: str, limit: int = 5) -> List[dict]:
    """Sort products by relevance so chatbot answers with best matches first."""
    ranked = sorted(
        products,
        key=lambda p: score_product_match(p, query),
        reverse=True,
    )
    return ranked[:limit]

def get_product_price_range(brand: str = None) -> dict:
    """Get price statistics for a brand"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if brand:
            query = """
                SELECT MIN(current_price), MAX(current_price), AVG(current_price), COUNT(*)
                FROM product
                WHERE brand = %s
            """
            cursor.execute(query, (brand,))
        else:
            query = """
                SELECT MIN(current_price), MAX(current_price), AVG(current_price), COUNT(*)
                FROM product
            """
            cursor.execute(query)
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            return {
                "min_price": result[0],
                "max_price": result[1],
                "avg_price": result[2],
                "count": result[3]
            }
        return {}
    except Exception as e:
        logger.error(f"Database stats error: {e}")
        return {}

# ──── Chatbot Intent Recognition ────────────────────────────────────────────
def extract_intent(message: str) -> dict:
    """
    Extract user intent and keywords from message
    Returns: { "intent": str, "keywords": List[str], "brand": Optional[str] }
    """
    msg_lower = message.lower()
    
    # Intent patterns
    search_keywords = ["tìm", "tìm kiếm", "mua", "giá", "bao nhiêu", "so sánh", "nào", "xem", "check", "kiếm"]
    info_keywords = ["thông tin", "thông số", "specs", "specs"]
    compare_keywords = ["so sánh", "khác nhau", "gì khác"]
    
    intent = "search"
    if any(kw in msg_lower for kw in compare_keywords):
        intent = "compare"
    elif any(kw in msg_lower for kw in info_keywords):
        intent = "info"
    elif any(kw in msg_lower for kw in search_keywords):
        intent = "search"
    else:
        intent = "general"
    
    # Extract keywords from normalized text
    normalized = re.sub(r"[^\w\s]", " ", msg_lower)
    words = normalized.split()
    stop_words = {
        "là", "cái", "chiếc", "bao", "nhiêu", "giá", "tìm", "nào", "này", "kia", "có",
        "không", "và", "hay", "gì", "cho", "mình", "em", "anh", "chị", "ơi", "ạ", "với"
    }
    keywords = [w for w in words if len(w) >= 2 and w not in stop_words]
    
    return {
        "intent": intent,
        "keywords": keywords,
        "original": message
    }


def build_search_candidates(user_msg: str, keywords: List[str]) -> List[str]:
    """Build query candidates so chatbot can search robustly with free-form input."""
    candidates: List[str] = []

    # 1) Keep full user message first
    full_msg = user_msg.strip()
    if full_msg:
        candidates.append(full_msg)

    # 2) Cleaned full message (remove punctuation noise)
    cleaned_msg = re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", full_msg)).strip()
    if cleaned_msg and cleaned_msg not in candidates:
        candidates.append(cleaned_msg)

    # 3) Joined keywords phrase
    if keywords:
        joined = " ".join(keywords).strip()
        if joined and joined not in candidates:
            candidates.append(joined)

    # 4) 2-word phrases capture model patterns like "galaxy tab", "tab a11"
    if len(keywords) >= 2:
        for i in range(len(keywords) - 1):
            pair = f"{keywords[i]} {keywords[i + 1]}".strip()
            if pair and pair not in candidates:
                candidates.append(pair)

    # 5) Single keywords, prioritize longer ones
    for kw in sorted(set(keywords), key=len, reverse=True):
        if kw and kw not in candidates:
            candidates.append(kw)

    return candidates


def is_greeting(message: str) -> bool:
    """Detect greeting-only messages so we can return intro instead of searching."""
    msg = message.lower().strip()
    greetings = ["hello", "hi", "xin chào", "chào", "hey"]
    return any(g in msg for g in greetings) and len(msg.split()) <= 4


def format_product_line(product: dict) -> str:
    """Safely format product info even when DB fields are NULL."""
    name = product.get("name") or "Sản phẩm chưa có tên"
    brand = (product.get("brand") or "N/A").upper()
    price = product.get("price")

    if isinstance(price, (int, float)):
        price_text = f"{price:,.0f}đ"
    else:
        price_text = "Chưa có giá"

    return f"• **{name}** ({brand}) - {price_text}"

# ──── Chatbot Response Generator ────────────────────────────────────────────
def generate_response(user_msg: str, history: List[Message] = None) -> ChatResponse:
    """
    Generate chatbot response based on user message
    - Try to search database first
    - Return product info if found
    - Otherwise return helpful message
    """
    if history is None:
        history = []
    
    intent_info = extract_intent(user_msg)
    intent = intent_info["intent"]
    keywords = intent_info["keywords"]
    
    logger.info(f"Intent: {intent}, Keywords: {keywords}")
    
    # Greeting only -> intro message
    if is_greeting(user_msg):
        reply = "Xin chào! 👋 Tôi là **PriceHawk Assistant** 🦅\n\nTôi có thể giúp bạn:\n• Tìm giá điện thoại, laptop, tablet\n• So sánh giá từ nhiều cửa hàng\n• Tra cứu thông số sản phẩm\n\nBạn muốn tìm sản phẩm nào?"
        return ChatResponse(reply=reply, source="system")

    # Always try search pipeline for all non-greeting inputs
    products = []
    search_candidates = build_search_candidates(user_msg, keywords)
    logger.info(f"Search candidates: {search_candidates}")

    for candidate in search_candidates:
        products = search_products(candidate)
        if products:
            products = rerank_products(products, candidate, limit=5)
            top_score = score_product_match(products[0], candidate)
            if top_score < MIN_DB_SCORE:
                logger.info(f"DB match below threshold (score={top_score}) for candidate: {candidate}")
                products = []
                continue
            break

    if products:
        # Format response with product info
        product_list = "\n".join([
            format_product_line(p)
            for p in products[:5]
        ])
        reply = f"Tôi tìm thấy các sản phẩm:\n\n{product_list}\n\nBạn muốn biết thêm chi tiết về sản phẩm nào không?"
        return ChatResponse(reply=reply, source="database")
    
    # Fallback: Try web search via SearXNG if DB has no results
    if SEARCH_AVAILABLE and keywords:
        try:
            search_query = " ".join(keywords[:3])  # Use top 3 keywords
            logger.info(f"DB search failed, trying web search for: {search_query}")
            web_results = search_web(search_query, num_results=3)
            
            if web_results:
                web_list = "\n".join([
                    f"• [{r['title']}]({r['url']})\n  {r['snippet'][:150]}..."
                    for r in web_results[:3]
                ])
                reply = f"Mình không tìm thấy sản phẩm trong cơ sở dữ liệu, nhưng tìm được thông tin trên mạng:\n\n{web_list}\n\nBạn muốn tìm gì khác không?"
                return ChatResponse(reply=reply, source="web")
        except Exception as e:
            logger.error(f"Web search fallback failed: {e}")
    
    # Final fallback: helpful message
    reply = "Mình chưa tìm thấy thông tin về sản phẩm này. Bạn thử nhập tên ngắn gọn hơn (ví dụ: Galaxy Tab A11, iPad mini 7, Redmi 14C) để mình tìm chính xác hơn nhé."
    return ChatResponse(reply=reply, source="system")

# ──── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Main chat endpoint
    - Receives user message + conversation history
    - Returns chatbot response with source
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        response = generate_response(
            request.message.strip(),
            request.history
        )
        logger.info(f"Response: {response.source}")
        return response
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/search")
async def search_api(q: str, limit: int = 5):
    """Direct product search endpoint"""
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    
    products = search_products(q.strip(), limit)
    return {"query": q, "results": products, "count": len(products)}

@app.get("/stats")
async def stats_api(brand: str = None):
    """Get price statistics"""
    stats = get_product_price_range(brand)
    return {"brand": brand, "stats": stats}

# ──── Main ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting PriceHawk Chatbot Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
