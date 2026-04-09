import json
import re
from urllib.parse import urlparse
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

import scrapy
from scrapy import signals
from scrapy.selector import Selector

from price_hawk.items import PhoneItem
from price_hawk.spiders.utils import (
    clean_space,
    extract_image_url,
    extract_json_ld_product,
    extract_total_products_hint,
    first_non_empty,
)
class TgddCatalogSpider(scrapy.Spider):
    name = "tgdd_catalog"
    allowed_domains = ["thegioididong.com"]
    CATEGORY_CONFIG = {
        "dien-thoai": {
            "start_url": "https://www.thegioididong.com/dtdd",
            "fallback_category_id": 42,
            "product_prefixes": ["/dtdd/"],
        },
        "dtdd": {
            "start_url": "https://www.thegioididong.com/dtdd",
            "fallback_category_id": 42,
            "product_prefixes": ["/dtdd/"],
        },
        "laptop": {
            "start_url": "https://www.thegioididong.com/laptop",
            "fallback_category_id": 44,
            "product_prefixes": ["/laptop/"],
        },
        "tablet": {
            "start_url": "https://www.thegioididong.com/may-tinh-bang",
            "fallback_category_id": None,
            "product_prefixes": ["/may-tinh-bang/"],
        },
        "may-tinh-bang": {
            "start_url": "https://www.thegioididong.com/may-tinh-bang",
            "fallback_category_id": None,
            "product_prefixes": ["/may-tinh-bang/"],
        },
    }
    listing_endpoint = "https://www.thegioididong.com/Category/FilterProductBox"
    max_page_index = 20

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super().from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_closed, signal=signals.spider_closed)
        return spider

    def __init__(self, *args, **kwargs):
        requested_category = clean_space(kwargs.pop("category", None)) or "dien-thoai"
        super().__init__(*args, **kwargs)

        category_key = requested_category.strip().lower()
        if category_key not in self.CATEGORY_CONFIG:
            valid = ", ".join(sorted(self.CATEGORY_CONFIG.keys()))
            raise ValueError(f"Unsupported category '{requested_category}'. Valid values: {valid}")

        self.category = category_key
        self.category_config = self.CATEGORY_CONFIG[category_key]
        self.start_urls = [self.category_config["start_url"]]
        self.category_id = self.category_config.get("fallback_category_id")
        self.seen_listing_pages = set()
        self.seen_product_urls = set()
        self.expected_total_hint = None
        self.crawled_item_count = 0

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(url, callback=self.parse)

    def parse(self, response):
        hint = extract_total_products_hint(response)
        if hint:
            self.expected_total_hint = max(self.expected_total_hint or 0, hint)

        if self.category_id is None:
            self.category_id = self._extract_category_id(response.text)

        if self.category_id is None:
            self.logger.warning("Could not detect TGDD category_id for '%s'; crawling only first-page links", self.category)
            for href in response.css("a.main-contain::attr(href), a[href*='-p']::attr(href)").getall():
                url = urljoin(self.start_urls[0], href)
                if url in self.seen_product_urls:
                    continue
                if not self._is_valid_product_url(url):
                    continue
                self.seen_product_urls.add(url)
                yield response.follow(url, callback=self.parse_detail)
            return

        for pi in range(0, self.max_page_index + 1):
            listproducts_html, total = self._fetch_listing_fragment(pi)
            self.seen_listing_pages.add(pi)

            if isinstance(total, int) and total > 0:
                self.expected_total_hint = max(self.expected_total_hint or 0, total)

            product_links = self._extract_listing_links(listproducts_html)
            if not product_links:
                if pi == 0:
                    self.logger.warning("TGDD XHR pi=0 returned no products")
                else:
                    self.logger.info("TGDD pagination stop at pi=%s", pi)
                break

            for href in product_links:
                url = urljoin(self.start_urls[0], href)
                if url in self.seen_product_urls:
                    continue
                if not self._is_valid_product_url(url):
                    continue
                self.seen_product_urls.add(url)
                yield response.follow(url, callback=self.parse_detail)

    def _fetch_listing_fragment(self, pi):
        request_url = f"{self.listing_endpoint}?c={self.category_id}&pi={pi}"
        body = urlencode({
            "IsParentCate": "0",
            "IsShowCompare": "1",
            "IsAffiliate": "0",
            "prevent": "true",
        }).encode("utf-8")

        request = Request(
            request_url,
            data=body,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
                "Referer": self.start_urls[0],
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response_obj:
                payload = json.loads(response_obj.read().decode("utf-8", errors="ignore"))
        except Exception as exc:
            self.logger.warning("TGDD XHR request failed at pi=%s: %s", pi, exc)
            return "", None

        listproducts_html = payload.get("listproducts") or ""
        total = payload.get("total")
        if isinstance(total, str) and total.isdigit():
            total = int(total)

        return listproducts_html, total

    def _extract_listing_links(self, listproducts_html):
        if not listproducts_html:
            return []

        fragment = Selector(text=f"<ul>{listproducts_html}</ul>")
        links = fragment.css("a.main-contain::attr(href)").getall()
        if not links:
            links = fragment.css("a[href^='/']::attr(href)").getall()
        return links

    def _extract_category_id(self, html_text):
        if not html_text:
            return None

        patterns = [
            r'"CategoryId"\s*:\s*(\d+)',
            r'"categoryId"\s*:\s*(\d+)',
            r'cateId\s*[:=]\s*(\d+)',
            r'categoryid\s*[:=]\s*(\d+)',
            r'data-cate-id\s*=\s*"(\d+)"',
        ]
        for pattern in patterns:
            match = re.search(pattern, html_text, flags=re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    continue
        return None

    def _is_valid_product_url(self, url):
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return False
        if parsed.netloc and "thegioididong.com" not in parsed.netloc:
            return False

        path = parsed.path.lower()
        prefixes = self.category_config.get("product_prefixes") or []
        if prefixes and not any(path.startswith(prefix) for prefix in prefixes):
            return False

        return True

    def parse_detail(self, response):
        ld_product = extract_json_ld_product(response)
        offers = ld_product.get("offers") if isinstance(ld_product, dict) else None
        if isinstance(offers, list) and offers:
            offers = offers[0]
        if not isinstance(offers, dict):
            offers = {}

        name = first_non_empty([
            ld_product.get("name") if isinstance(ld_product, dict) else None,
            response.css("h1::text").get(),
            response.css("meta[property='og:title']::attr(content)").get(),
        ])

        price = first_non_empty([
            offers.get("price"),
            response.css("p.box-price-present::text").get(),
            response.css("strong.price::text").get(),
        ])

        old_price = first_non_empty([
            response.css("p.box-price-old::text").get(),
            response.css(".box-price .price-old::text").get(),
        ])

        availability = str(offers.get("availability", "")).lower()
        stock_text = " ".join(response.css("div.box-available *::text").getall()).lower()
        in_stock = True
        if "outofstock" in availability or "hết hàng" in stock_text:
            in_stock = False

        image_url = first_non_empty([
            ld_product.get("image") if isinstance(ld_product, dict) else None,
            response.css("meta[property='og:image']::attr(content)").get(),
        ])
        image_url = extract_image_url(image_url)

        description = first_non_empty([
            response.css("meta[property='og:description']::attr(content)").get(),
            response.css("meta[name='description']::attr(content)").get(),
        ])
        breadcrumb_tokens = [
            clean_space(t)
            for t in response.css("nav[aria-label='breadcrumb'] a::text, .breadcrumb a::text, .breadcrumbs a::text").getall()
        ]
        breadcrumb_tokens = [t for t in breadcrumb_tokens if t]
        category_path_raw = " > ".join(breadcrumb_tokens) if breadcrumb_tokens else "dien-thoai"

        self.crawled_item_count += 1

        yield PhoneItem(
            source="tgdd",
            product_id=response.url.rstrip("/").split("/")[-1],
            name=clean_space(name),
            brand=None,
            model=clean_space(name),
            variant=None,
            price=price,
            old_price=old_price,
            in_stock=in_stock,
            product_url=response.url,
            image_url=image_url,
            description=clean_space(description),
            category_path_raw=category_path_raw,
        )

    def spider_closed(self, spider, reason):
        stats = spider.crawler.stats
        stats.set_value("completeness/crawled_items", self.crawled_item_count)
        stats.set_value("completeness/listing_pages", len(self.seen_listing_pages))
        stats.set_value("completeness/expected_hint", self.expected_total_hint)
        stats.set_value("completeness/category", self.category)

        if reason == "closespider_itemcount":
            return

        if self.expected_total_hint and self.crawled_item_count < self.expected_total_hint:
            self.logger.warning(
                "Potentially incomplete crawl: crawled=%s, expected_hint=%s",
                self.crawled_item_count,
                self.expected_total_hint,
            )
        else:
            self.logger.info(
                "Completeness check passed or unavailable: crawled=%s, expected_hint=%s",
                self.crawled_item_count,
                self.expected_total_hint,
            )


class TgddPhoneSpider(TgddCatalogSpider):
    name = "tgdd_phone"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("category", "dien-thoai")
        super().__init__(*args, **kwargs)
