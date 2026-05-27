"""
responder_agent.py — Agent 4: Tạo câu trả lời cuối cùng bằng tiếng Việt.

Dùng google.genai SDK trực tiếp (consistent với các agent khác).
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None
MODEL_PRIMARY = "llama-3.3-70b-versatile"
MODEL_FALLBACK = "llama-3.1-8b-instant"

RETAILER_DISPLAY = {
    "tgdd": "Thế Giới Di Động",
    "fpt": "FPT Shop",
    "hoangha": "Hoàng Hà Mobile",
    "cellphones": "CellphoneS",
}

IRRELEVANT_REPLY = (
    "Xin chào! Mình là trợ lý so sánh giá của **PriceHawk** 🦅\n\n"
    "Mình chỉ có thể giúp bạn với:\n"
    "- 📱 **Tìm giá điện thoại** từ nhiều cửa hàng\n"
    "- 💻 **So sánh giá laptop** giữa TGDD, FPT Shop, Hoàng Hà Mobile\n"
    "- 📊 **Thông số kỹ thuật** và đánh giá sản phẩm\n\n"
    "Bạn muốn tìm sản phẩm nào?"
)


OUT_OF_SCOPE_REPLY = (
    "Câu hỏi này nằm ngoài phạm vi mình có thể hỗ trợ 😅\n\n"
    "**PriceHawk** chuyên về:\n"
    "- 💰 So sánh **giá** điện thoại, laptop, tablet\n"
    "- 📊 **Thông số kỹ thuật** và đánh giá sản phẩm\n\n"
    "Bạn muốn tìm giá hoặc so sánh sản phẩm nào không?"
)

def _format_price(price) -> str:
    try:
        price_int = int(float(price))
        return f"{price_int:,}đ".replace(",", ".")
    except (ValueError, TypeError):
        return str(price) if price else "Liên hệ"


def _format_product_data(products: list[dict]) -> str:
    if not products:
        return "Không có dữ liệu."
    lines = []
    for i, product in enumerate(products[:3], 1):
        lines.append(f"\n[Sản phẩm {i}] {product['name']}")
        if product.get("brand"):
            lines.append(f"  Thương hiệu: {product['brand']}")
        if product.get("prices"):
            lines.append("  Giá theo cửa hàng:")
            for price_info in product["prices"]:
                retailer_key = price_info.get("retailer", "")
                retailer_display = RETAILER_DISPLAY.get(retailer_key, retailer_key.upper())
                price_str = _format_price(price_info.get("price"))
                url = price_info.get("url", "")
                lines.append(f"    - {retailer_display}: {price_str} ({url})")
    return "\n".join(lines)


class ResponderAgent:
    async def reply_from_db(self, db_result: dict, user_message: str, intent: str) -> dict:
        """Tạo câu trả lời khi có dữ liệu từ DB."""
        products = db_result.get("products", [])
        product_data_text = _format_product_data(products)

        if intent == "compare":
            instruction = (
                /*"Hãy trình bày thông tin SO SÁNH chi tiết cho các sản phẩm tìm được dưới dạng DANH SÁCH (TUYỆT ĐỐI KHÔNG DÙNG BẢNG). "
                "Mỗi sản phẩm hãy in đậm tên, sau đó gạch đầu dòng các tiêu chí cơ bản (Giá, RAM, Camera, Pin, Chipset). VÌ DỮ LIỆU HỆ THỐNG CHỈ CÓ GIÁ, HÃY TỰ DÙNG KIẾN THỨC SẴN CÓ CỦA BẠN ĐỂ ĐIỀN THÔNG SỐ KỸ THUẬT, nhưng MỨC GIÁ thì bắt buộc phải lấy từ dữ liệu hệ thống (kèm link mua hàng, định dạng CHUẨN MARKDOWN: [Tên cửa hàng](url)). "
                "Sau khi liệt kê, thêm 2-3 dòng nhận xét ngắn gọn (VD: ưu/nhược điểm của từng máy, máy nào phù hợp với ai)."*/
            )
        else:
            instruction = (
                "1. Tóm tắt sản phẩm tìm được\n"
                "2. Bảng giá từ các cửa hàng (rẻ đến đắt), BẮT BUỘC chèn kèm link mua hàng (định dạng CHUẨN MARKDOWN: [Tên cửa hàng](url) - TUYỆT ĐỐI KHÔNG CÓ DẤU CÁCH giữa ] và (). Ví dụ: [FPT Shop](https://...)\n"
                "3. Gợi ý cửa hàng rẻ nhất và chèn lại link của sản phẩm rẻ nhất đó.\n"
                "Nếu nhiều sản phẩm tương tự, hiển thị tối đa 3 cái phù hợp nhất."
            )

        partial_notice = ""
        if db_result.get("partial_fallback"):
            partial_notice = (
                f"\n\nLƯU Ý QUAN TRỌNG CHO BẠN: Hệ thống KHÔNG tìm thấy chính xác sản phẩm '{db_result.get('search_keyword')}' "
                f"mà người dùng yêu cầu, mà chỉ tìm thấy các sản phẩm có tên tương tự dưới đây. "
                f"Hãy LỊCH SỰ XIN LỖI người dùng vì không tìm thấy sản phẩm chính xác, "
                f"sau đó mới đề xuất các sản phẩm tương tự này."
            )

        prompt = (
            f"Bạn là trợ lý so sánh giá của PriceHawk — website so sánh giá điện thoại, laptop, tablet tại Việt Nam.\n\n"
            f"Người dùng hỏi: \"{user_message}\"\n\n"
            f"Thông tin giá từ hệ thống:\n{product_data_text}{partial_notice}\n\n"
            f"Hãy viết câu trả lời tiếng Việt thân thiện, bao gồm:\n"
            f"{instruction}"
        )

        models_to_try = [MODEL_PRIMARY, MODEL_FALLBACK] if client else []

        for attempt, model_name in enumerate(models_to_try):
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    temperature=0.3,
                    messages=[{"role": "user", "content": prompt}]
                )
                reply_text = response.choices[0].message.content.strip()
                break
            except Exception as e:
                if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)):
                    if attempt < len(models_to_try) - 1:
                        import asyncio
                        print(f"[ResponderAgent] Rate limit, retrying with next model...")
                        await asyncio.sleep(2)
                        continue
                print(f"[ResponderAgent] LLM error ({model_name}): {e}")
                reply_text = self._manual_format_db(products)
                break

        return {
            "reply": reply_text,
            "source": "database",
            "products": products,
            "search_keyword": db_result.get("search_keyword"),
        }

    async def reply_from_internet(self, internet_result: dict, user_message: str) -> dict:
        """Tạo câu trả lời khi lấy dữ liệu từ Internet fallback."""
        if not internet_result.get("found"):
            return self.reply_not_found(user_message, internet_result.get("keyword", ""))

        source_url = internet_result.get("source_url", "")
        summary = internet_result.get("summary", "")

        prompt = (
            f"Bạn là trợ lý so sánh giá của PriceHawk.\n\n"
            f"Người dùng hỏi: \"{user_message}\"\n\n"
            f"Thông tin tìm được từ internet (nguồn: {source_url}):\n{summary}\n\n"
            f"Hãy viết câu trả lời tiếng Việt thân thiện dựa trên thông tin trên. "
            f"Ghi rõ nguồn thông tin ở cuối câu trả lời, BẮT BUỘC định dạng nguồn bằng chuẩn Markdown: [Nguồn tham khảo]({source_url}) - TUYỆT ĐỐI KHÔNG CÓ DẤU CÁCH giữa ] và ()."
        )

        models_to_try = [MODEL_PRIMARY, MODEL_FALLBACK] if client else []

        for attempt, model_name in enumerate(models_to_try):
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    temperature=0.3,
                    messages=[{"role": "user", "content": prompt}]
                )
                reply_text = response.choices[0].message.content.strip()
                break
            except Exception as e:
                if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)):
                    if attempt < len(models_to_try) - 1:
                        import asyncio
                        print(f"[ResponderAgent] Rate limit, retrying with next model...")
                        await asyncio.sleep(2)
                        continue
                print(f"[ResponderAgent] LLM error ({model_name}): {e}")
                reply_text = (
                    f"Tôi tìm được thông tin về **{internet_result.get('keyword')}** từ web:\n\n"
                    f"{summary}\n\n[Nguồn tham khảo]({source_url})"
                )
                break

        return {
            "reply": reply_text,
            "source": "internet",
            "products": [],
            "source_url": source_url,
        }

    def reply_irrelevant(self) -> dict:
        return {"reply": IRRELEVANT_REPLY, "source": "system", "products": []}

    def reply_out_of_scope(self) -> dict:
        return {"reply": OUT_OF_SCOPE_REPLY, "source": "system", "products": []}

    def reply_not_found(self, user_message: str, keyword: str) -> dict:
        reply = (
            f"Xin lỗi, tôi không tìm thấy thông tin về **{keyword or user_message}** "
            f"trong cơ sở dữ liệu của PriceHawk cũng như trên các trang web công nghệ.\n\n"
            f"Bạn có thể thử:\n"
            f"- Kiểm tra lại tên sản phẩm\n"
            f"- Tìm kiếm trực tiếp tại [Thế Giới Di Động](https://thegioididong.com), "
            f"[FPT Shop](https://fptshop.com.vn) hoặc [Hoàng Hà Mobile](https://hoanghamobile.com)"
        )
        return {"reply": reply, "source": "not_found", "products": []}

    def _manual_format_db(self, products: list[dict]) -> str:
        if not products:
            return "Không tìm thấy sản phẩm phù hợp."
        lines = ["Tôi tìm thấy các sản phẩm sau trong hệ thống:\n"]
        for product in products[:3]:
            lines.append(f"**{product['name']}**")
            for price_info in product.get("prices", []):
                retailer_key = price_info.get("retailer", "")
                retailer_display = RETAILER_DISPLAY.get(retailer_key, retailer_key)
                price_str = _format_price(price_info.get("price"))
                lines.append(f"- {retailer_display}: {price_str}")
            lines.append("")
        return "\n".join(lines)
