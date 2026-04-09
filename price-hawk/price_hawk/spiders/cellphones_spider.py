import json
import math
from urllib.parse import urljoin

import scrapy

from price_hawk.items import PhoneItem
from price_hawk.spiders.utils import clean_space, extract_image_url, extract_json_ld_product, first_non_empty


class CellphoneSPhoneSpider(scrapy.Spider):
    name = "cellphones_phone"
    allowed_domains = ["cellphones.com.vn", "api.cellphones.com.vn"]
    start_urls = ["https://cellphones.com.vn/mobile.html"]
    graphql_endpoint = "https://api.cellphones.com.vn/v2/graphql/query"

    category_id = "3"
    province_id = 30
    page_size = 20
    max_pages = 80

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.seen_product_urls = set()
        self.seen_page_indexes = set()
        self.expected_total_hint = None
        self.crawled_item_count = 0

    def start_requests(self):
        yield scrapy.Request(self.start_urls[0], callback=self.parse)

    def parse(self, response):
        yield self._graphql_request(
            query=self._build_total_query(),
            callback=self.parse_total,
        )

    def parse_total(self, response):
        payload = self._safe_json(response)
        total = ((payload.get("data") or {}).get("total"))
        if isinstance(total, int) and total > 0:
            self.expected_total_hint = total
            total_pages = min(self.max_pages, math.ceil(total / self.page_size))
        else:
            total_pages = 1

        for page in range(1, total_pages + 1):
            if page in self.seen_page_indexes:
                continue
            self.seen_page_indexes.add(page)
            yield self._graphql_request(
                query=self._build_products_query(page),
                callback=self.parse_products_page,
                cb_kwargs={"page": page},
            )

    def parse_products_page(self, response, page):
        payload = self._safe_json(response)
        products = ((payload.get("data") or {}).get("products")) or []
        if not products:
            self.logger.info("CellphoneS pagination stop at page=%s", page)
            return

        for product in products:
            if not isinstance(product, dict):
                continue
            general = product.get("general") or {}
            filterable = product.get("filterable") or {}
            url_path = general.get("url_path")
            if not url_path:
                continue

            if not str(url_path).endswith(".html"):
                url_path = f"{url_path}.html"

            url = urljoin(self.start_urls[0], url_path)
            if url in self.seen_product_urls:
                continue
            if not self._is_phone_product_url(url):
                continue

            listing_price = filterable.get("special_price") or filterable.get("price")
            listing_old_price = filterable.get("price")

            stock_available = filterable.get("stock_available_id")
            listing_in_stock = None
            if isinstance(stock_available, list):
                listing_in_stock = any(str(x) in {"46", "56", "152", "4920"} for x in stock_available)
            elif stock_available is not None:
                listing_in_stock = str(stock_available) in {"46", "56", "152", "4920"}

            self.seen_product_urls.add(url)
            yield response.follow(
                url,
                callback=self.parse_detail,
                cb_kwargs={
                    "listing_price": listing_price,
                    "listing_old_price": listing_old_price,
                    "listing_in_stock": listing_in_stock,
                    "listing_brand": general.get("manufacturer"),
                },
            )

    def parse_detail(
        self,
        response,
        listing_price=None,
        listing_old_price=None,
        listing_in_stock=None,
        listing_brand=None,
    ):
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
            response.css("meta[property='product:price:amount']::attr(content)").get(),
            response.css("meta[itemprop='price']::attr(content)").get(),
            response.css(".product__price--show::text").get(),
            response.css(".block-box-price .special-price::text").get(),
            response.css(".price::text").get(),
            listing_price,
        ])

        old_price = first_non_empty([
            response.css(".product__price--through::text").get(),
            response.css(".block-box-price .old-price::text").get(),
            response.css(".old-price::text").get(),
            listing_old_price,
        ])

        availability = str(offers.get("availability", "")).lower()
        in_stock = listing_in_stock if listing_in_stock is not None else True
        if "outofstock" in availability:
            in_stock = False
        if "instock" in availability:
            in_stock = True

        # Some pages keep stale schema price=0 even when listing API has a real value.
        if price in (0, "0", "0đ") and listing_price not in (None, 0, "0", "0đ"):
            price = listing_price

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

        brand = first_non_empty([
            ld_product.get("brand") if isinstance(ld_product, dict) else None,
            listing_brand,
        ])
        if isinstance(brand, dict):
            brand = first_non_empty([brand.get("name")])

        self.crawled_item_count += 1

        yield PhoneItem(
            source="cellphones",
            product_id=response.url.rstrip("/").split("/")[-1].replace(".html", ""),
            name=clean_space(name),
            brand=clean_space(brand),
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

    def closed(self, reason):
        self.crawler.stats.set_value("completeness/crawled_items", self.crawled_item_count)
        self.crawler.stats.set_value("completeness/listing_pages", len(self.seen_page_indexes))
        self.crawler.stats.set_value("completeness/expected_hint", self.expected_total_hint)

    def _graphql_request(self, query, callback, cb_kwargs=None):
        body = json.dumps({"query": query, "variables": {}})
        return scrapy.Request(
            url=self.graphql_endpoint,
            method="POST",
            body=body,
            callback=callback,
            cb_kwargs=cb_kwargs or {},
            dont_filter=True,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Referer": self.start_urls[0],
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
            },
        )

    def _safe_json(self, response):
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            self.logger.warning("CellphoneS GraphQL decode error: %s", response.text[:200])
            return {}

    def _build_total_query(self):
        return f'''
query TotalByCate {{
    total(
        filter: {{
            static: {{
                categories: ["{self.category_id}"],
                excluded: {{ categories: [] }},
                province_id: {self.province_id},
                stock: {{ from: 1 }},
                company_stock_id: [46, 152, 4920]
            }},
            dynamic: {{}}
        }}
    )
}}
'''

    def _build_products_query(self, page):
        return f'''
query GetProductsByCateId {{
    products(
        filter: {{
            static: {{
                categories: ["{self.category_id}"],
                excluded: {{ categories: [] }},
                province_id: {self.province_id},
                stock: {{ from: 1 }},
                company_stock_id: [46, 152, 4920]
            }},
            dynamic: {{}}
        }},
        page: {page},
        size: {self.page_size},
        sort: [{{view: desc}}]
    ) {{
        general {{
            product_id
            name
            url_path
            manufacturer
        }}
        filterable {{
            price
            special_price
            stock_available_id
        }}
    }}
}}
'''

    def _is_phone_product_url(self, url):
        if "cellphones.com.vn" not in url or not url.endswith(".html"):
            return False

        blocked_parts = [
            "/laptop",
            "/tablet",
            "/tai-nghe",
            "/phu-kien",
            "/dong-ho",
            "/am-thanh",
            "/camera",
            "/man-hinh",
            "/sforum",
        ]

        lowered = url.lower()
        return not any(part in lowered for part in blocked_parts)
