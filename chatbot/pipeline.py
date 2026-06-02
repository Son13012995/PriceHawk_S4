"""
pipeline.py — Orchestrator kết nối 4 Agent theo đúng kiến trúc Agentic-RAG.

Flow:
1. Intent Agent  → xác định intent + entity
2. DB Agent      → search MySQL
   - exact match  → trả về ngay từ DB ✅
   - partial match → gọi Internet trước, nếu fail → fallback DB partial + disclaimer
   - not found    → gọi Internet
3. [Fallback] Internet Agent → SearxNG + Crawl4AI
4. Responder     → tạo câu trả lời tiếng Việt
"""

import asyncio
import time
from agents.intent_agent import (
    IntentAgent, INTENT_IRRELEVANT, INTENT_COMPARE, INTENT_OUT_OF_SCOPE
)
from agents.db_agent import DBAgent
from agents.internet_agent import InternetAgent
from agents.responder_agent import ResponderAgent


class ChatbotPipeline:
    def __init__(self):
        print("[Pipeline] Initializing agents...")
        self.intent_agent = IntentAgent()
        self.db_agent = DBAgent()
        self.internet_agent = InternetAgent()
        self.responder = ResponderAgent()
        print("[Pipeline] All agents ready.")

    async def run(self, user_message: str, history: list = None) -> dict:
        """
        Chạy toàn bộ pipeline.

        Args:
            user_message: Câu hỏi của user
            history: Lịch sử chat (list of {"role": "user"|"assistant", "content": str})

        Returns:
            {
                "reply": str,               # Câu trả lời tiếng Việt
                "source": str,              # "database" | "internet" | "system" | "not_found"
                "products": list,           # Danh sách sản phẩm (nếu từ DB)
                "intent": str,              # Intent đã detect
                "search_keyword": str,      # Từ khóa đã tìm
                "latency_ms": float,        # Thời gian xử lý
            }
        """
        start_time = time.time()
        history = history or []

        print(f"\n[Pipeline] ─── New request ───────────────────────────")
        print(f"[Pipeline] User: {user_message[:100]}")

        # ── Step 1: Intent Agent ─────────────────────────────────────────────
        print("[Pipeline] Step 1: Intent analysis...")
        intent_result = await self.intent_agent.run(user_message, history)
        intent = intent_result.get("intent")
        product_name = intent_result.get("product_name")
        product_name_2 = intent_result.get("product_name_2")
        category = intent_result.get("category")

        print(f"[Pipeline] Intent: {intent} | Product: {product_name} | Product 2: {product_name_2} | Category: {category}")

        if intent == INTENT_IRRELEVANT:
            print("[Pipeline] Intent is irrelevant → returning system reply")
            result = self.responder.reply_irrelevant()
            return self._finalize(result, intent, product_name, start_time)

        if intent == INTENT_OUT_OF_SCOPE:
            print("[Pipeline] Intent is out of scope → returning system reply")
            result = self.responder.reply_out_of_scope()
            return self._finalize(result, intent, product_name, start_time)

        # 2. Tìm trong DB — nếu compare thì query 2 sản phẩm song song luôn
        db_keyword = product_name if product_name else user_message

        internet_result_2 = None
        if intent == INTENT_COMPARE and product_name_2:
            print(f"[Pipeline] Compare mode: querying DB for both '{db_keyword}' & '{product_name_2}' in parallel...")
            db_result, db_result_2 = await asyncio.gather(
                self.db_agent.run(db_keyword, category),
                self.db_agent.run(product_name_2, category),
            )

            if db_result_2.get("found"):
                # DB có sản phẩm 2 → gộp vào
                db_result["found"] = True
                db_result["products"] = db_result.get("products", []) + db_result_2.get("products", [])
                db_result["search_keyword"] = f"{db_keyword} & {product_name_2}"
            else:
                # Sản phẩm 2 không có DB → thử Internet, chạy song song với sản phẩm 1 nếu cần
                need_internet_1 = not db_result.get("found") or db_result.get("match_type") == "partial"
                if need_internet_1:
                    print(f"[Pipeline] Both products need internet → searching in parallel...")
                    internet_result, internet_result_2 = await asyncio.gather(
                        self.internet_agent.run(db_keyword),
                        self.internet_agent.run(product_name_2),
                    )
                    # Gộp kết quả internet vào db_result để xử lý bên dưới
                    if internet_result.get("found"):
                        db_result["internet_result"] = internet_result
                    if internet_result_2.get("found"):
                        db_result["internet_supplement"] = internet_result_2
                    db_result["search_keyword"] = f"{db_keyword} & {product_name_2}"
                    # Skip internet fallback bên dưới vì đã chạy rồi
                    db_result["internet_already_done"] = True
                else:
                    print(f"[Pipeline] Product 2 '{product_name_2}' not in DB → trying Internet...")
                    internet_result_2 = await self.internet_agent.run(product_name_2)
                    if internet_result_2.get("found"):
                        print(f"[Pipeline] Internet found info for '{product_name_2}'")
                        db_result["internet_supplement"] = internet_result_2
                    db_result["search_keyword"] = f"{db_keyword} & {product_name_2}"
        else:
            # Non-compare: query bình thường 1 sản phẩm
            print(f"[Pipeline] Step 2: DB search for '{db_keyword}'...")
            db_result = await self.db_agent.run(db_keyword, category)

        db_match_type = db_result.get("match_type")  # "exact" | "partial" | None

        if db_result.get("found") and db_match_type == "exact" and not db_result.get("internet_supplement"):
            # Exact match cho cả 2 → trả về DB ngay
            print(f"[Pipeline] DB exact match → {len(db_result['products'])} products")
            result = await self.responder.reply_from_db(db_result, user_message, intent)
            return self._finalize(result, intent, db_result.get("search_keyword", db_keyword), start_time)

        if db_result.get("found") and db_match_type == "exact" and db_result.get("internet_supplement"):
            # Exact match 1 sản phẩm + Internet supplement sản phẩm 2
            print(f"[Pipeline] DB exact + Internet supplement → hybrid reply")
            result = await self.responder.reply_from_db(db_result, user_message, intent)
            return self._finalize(result, intent, db_result.get("search_keyword", db_keyword), start_time)

        # Nếu đã chạy internet trong compare block thì skip
        if db_result.get("internet_already_done"):
            if db_result.get("internet_result", {}).get("found"):
                print(f"[Pipeline] Using parallel internet result for product 1")
                result = await self.responder.reply_from_internet(db_result["internet_result"], user_message)
                return self._finalize(result, intent, db_result.get("search_keyword", db_keyword), start_time)
            elif db_result.get("found") and db_result.get("match_type") == "exact":
                result = await self.responder.reply_from_db(db_result, user_message, intent)
                return self._finalize(result, intent, db_result.get("search_keyword", db_keyword), start_time)

        # Partial match hoặc không tìm thấy → gọi Internet trước
        if db_result.get("found") and db_match_type == "partial":
            print(f"[Pipeline] DB partial match → trying Internet first for accuracy...")
        else:
            print(f"[Pipeline] DB miss → Step 3: Internet fallback for '{db_keyword}'...")

        internet_result = await self.internet_agent.run(db_keyword)

        if internet_result.get("found"):
            print(f"[Pipeline] Internet hit → using internet result")
            result = await self.responder.reply_from_internet(internet_result, user_message)
            return self._finalize(result, intent, db_keyword, start_time)

        # Internet fail → fallback về DB partial (nếu có) kèm disclaimer
        if db_result.get("found") and db_match_type == "partial":
            print(f"[Pipeline] Internet fail → falling back to DB partial result with disclaimer")
            db_result["partial_fallback"] = True  # flag để Responder thêm disclaimer
            result = await self.responder.reply_from_db(db_result, user_message, intent)
            return self._finalize(result, intent, db_result.get("search_keyword", db_keyword), start_time)

        # Cả DB lẫn Internet đều không có → not found
        print(f"[Pipeline] Both DB and Internet found nothing.")
        result = await self.responder.reply_from_internet(internet_result, user_message)
        return self._finalize(result, intent, db_keyword, start_time)

    def _finalize(self, result: dict, intent: str, keyword: str, start_time: float) -> dict:
        latency = round((time.time() - start_time) * 1000, 1)
        print(f"[Pipeline] Done. Source: {result.get('source')} | Latency: {latency}ms")
        return {
            **result,
            "intent": intent,
            "search_keyword": keyword,
            "latency_ms": latency,
        }
