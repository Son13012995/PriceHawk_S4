"""
internet_agent.py — Agent 3: Internet Fallback.

Dùng google.genai SDK trực tiếp. Flow: DuckDuckGo → Crawl4AI → Gemini summarize.
"""

import os
import time
import asyncio
from dotenv import load_dotenv
from groq import Groq
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
import httpx

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key) if groq_api_key else None
MODEL_PRIMARY = "llama-3.3-70b-versatile"
MODEL_FALLBACK = "llama-3.1-8b-instant"


class InternetAgent:
    def __init__(self):
        self._crawler: AsyncWebCrawler | None = None

    async def _get_crawler(self) -> AsyncWebCrawler:
        if self._crawler is None:
            self._crawler = AsyncWebCrawler()
            await self._crawler.start()
        return self._crawler

    async def run(self, keyword: str) -> dict:
        """
        Returns:
            { "found": bool, "summary": str|None, "source_url": str|None, "keyword": str }
        """
        if not keyword:
            return self._not_found(keyword)

        print(f"[InternetAgent] Searching internet for: '{keyword}'")

        # Step 1: DuckDuckGo / Google Search
        search_results = await self._web_search(keyword)
        if not search_results:
            print("[InternetAgent] Search returned no results")
            return self._not_found(keyword)

        # Step 2: Chọn URL tốt nhất (ưu tiên các site tech VN)
        best_url = self._pick_best_url(search_results)
        print(f"[InternetAgent] Crawling: {best_url}")

        # Step 3: Crawl4AI
        content = await self._crawl(best_url)
        if not content:
            print("[InternetAgent] Crawl returned empty content")
            return self._not_found(keyword)

        # Step 4: Gemini summarize
        summary = await self._summarize(keyword, content)
        if not summary:
            return self._not_found(keyword)

        print(f"[InternetAgent] Summary generated ({len(summary)} chars)")
        return {
            "found": True,
            "summary": summary,
            "source_url": best_url,
            "keyword": keyword,
        }

    async def _web_search(self, keyword: str) -> list[dict]:
        """Sử dụng API của SearxNG cục bộ để search, tránh bị Rate Limit từ Google."""
        query = f"{keyword} giá thông số đánh giá Việt Nam"
        print(f"[InternetAgent] Querying SearxNG: {query}")
        
        # Lấy cấu hình SEARXNG_URL (trong docker có thể là http://searxng:8080)
        searxng_url = os.getenv("SEARXNG_URL", "http://localhost:8080")
        
        for attempt in range(3):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{searxng_url}/search",
                        params={"q": query, "format": "json"},
                        timeout=10.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    results = data.get("results", [])
                    
                    if results:
                        print(f"[InternetAgent] SearxNG search success, found {len(results)} URLs")
                        # Trả về format [{"href": url}]
                        return [{"href": r.get("url", "")} for r in results[:5]]
                    else:
                        print(f"[InternetAgent] SearxNG returned empty results (Attempt {attempt+1}/3)")
            except Exception as e:
                err = str(e)
                print(f"[InternetAgent] SearxNG attempt {attempt+1}/3: {err}")
            await asyncio.sleep(2)
        return []

    def _pick_best_url(self, results: list[dict]) -> str:
        """Ưu tiên các trang tech Việt Nam, fallback về kết quả đầu tiên."""
        priority_domains = [
            "thegioididong.com", "fptshop.com.vn", "hoanghamobile.com",
            "tinhte.vn", "genk.vn", "cellphones.com.vn", "websosanh.vn",
        ]
        for domain in priority_domains:
            for r in results:
                url = r.get("href", "")
                if domain in url:
                    return url
        return results[0].get("href", "")

    async def _crawl(self, url: str) -> str | None:
        """Crawl URL bằng Crawl4AI, trả về markdown."""
        try:
            config = CrawlerRunConfig(
                word_count_threshold=50,
                exclude_external_links=True,
                remove_overlay_elements=True,
            )
            crawler = await self._get_crawler()
            result = await crawler.arun(url=url, config=config)
            if result and result.success and result.markdown:
                return result.markdown[:5000]
            return None
        except Exception as e:
            print(f"[InternetAgent] Crawl error: {e}")
            self._crawler = None
            return None

    async def _summarize(self, keyword: str, content: str) -> str | None:
        """Gemini tóm tắt nội dung crawl được."""
        prompt = (
            f"Tóm tắt thông tin về sản phẩm '{keyword}' từ nội dung sau bằng tiếng Việt "
            f"(tối đa 300 từ). Tập trung vào: giá, thông số kỹ thuật, ưu/nhược điểm.\n\n"
            f"Nội dung:\n{content}"
        )
        
        models_to_try = [MODEL_PRIMARY, MODEL_FALLBACK] if client else []
        for attempt, model_name in enumerate(models_to_try):
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.choices[0].message.content.strip()
                if attempt > 0:
                    print(f"[InternetAgent] Summarized using fallback model: {model_name}")
                return text if text else None
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    if attempt < len(models_to_try) - 1:
                        print(f"[InternetAgent] Rate limit on summarize ({model_name}), retrying with next model...")
                        await asyncio.sleep(2)
                        continue
                print(f"[InternetAgent] Summarize error ({model_name}): {e}")
                break
        return None

    def _not_found(self, keyword: str) -> dict:
        return {"found": False, "summary": None, "source_url": None, "keyword": keyword}

