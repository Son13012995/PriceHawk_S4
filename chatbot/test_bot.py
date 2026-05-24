import asyncio
import sys
import os

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure correct path so it imports modules correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline import ChatbotPipeline

async def main():
    pipeline = ChatbotPipeline()
    
    queries = [
        # Nhóm 1: Có trong DB (Chính xác / Tương đối)
        "Giá iPhone 15 bản 128GB là bao nhiêu?",
        "Tìm cho tôi con laptop macbook pro m2",
        
        # Nhóm 2: So sánh sản phẩm
        "So sánh iPhone 15 và Samsung S24",
        "Nên mua điện thoại iPhone 14 Pro Max hay Samsung Galaxy S23 Ultra",
        
        # Nhóm 3: Hỏi đánh giá / Review (Sẽ gọi DB trước, nếu không đủ thông tin có thể sang Internet)
        "Đánh giá chi tiết Samsung Galaxy Z Fold 5 có tốt không?",
        
        # Nhóm 4: Mới ra mắt / Không có trong DB (Ép chạy Internet Fallback)
        "Cho mình xin giá và cấu hình của Xiaomi 14 Ultra",
        "Có nên mua iPad Pro M4 bản 2024 không?",
        
        # Nhóm 5: Out of Scope (Hàng công nghệ nhưng ngoài phạm vi hỗ trợ)
        "Sửa màn hình iPhone 15 Pro Max hết bao nhiêu tiền?",
        "Cách cài tiếng Việt cho Windows 11",
        
        # Nhóm 6: Hoàn toàn không liên quan (Irrelevant)
        "Giá vàng hôm nay là bao nhiêu 1 chỉ?",
        "Bạn ăn cơm chưa?"
    ]
    
    for q in queries:
        print(f"\n{'='*50}")
        print(f"USER: {q}")
        print(f"{'='*50}")
        res = await pipeline.run(q)
        print("\nBOT:")
        print(res.get("reply"))
        print(f"\n[Debug] Source: {res.get('source')} | Intent: {res.get('intent')} | Keyword: {res.get('search_keyword')} | Latency: {res.get('latency_ms')}ms")

if __name__ == "__main__":
    asyncio.run(main())
