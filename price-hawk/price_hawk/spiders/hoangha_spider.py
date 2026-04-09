from urllib.parse import parse_qs, urljoin, urlparse, urlunparse

import scrapy
from scrapy import signals

from price_hawk.items import PhoneItem
from price_hawk.spiders.utils import (
    clean_space,
    extract_image_url,
    extract_json_ld_product,
    extract_total_products_hint,
    first_non_empty,
)
class HoangHaCatalogSpider(scrapy.Spider):
    name = "hoangha_catalog"
    allowed_domains = ["hoanghamobile.com"]
    CATEGORY_CONFIG = {
        "dien-thoai": {
            "listing_base_url": "https://hoanghamobile.com/dien-thoai-di-dong",
            "max_listing_pages": 15,
            "product_prefixes": None,
        },
        "laptop": {
            "listing_base_url": "https://hoanghamobile.com/laptop",
            "max_listing_pages": 20,
            "product_prefixes": ["/laptop/", "/lap-top/"],
        },
        "tablet": {
            "listing_base_url": "https://hoanghamobile.com/tablet",
            "max_listing_pages": 20,
            "product_prefixes": ["/tablet/", "/may-tinh-bang/"],
        },
    }

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
        self.listing_base_url = self.category_config["listing_base_url"]
        self.max_listing_pages = int(self.category_config["max_listing_pages"])
        self.start_urls = [self.listing_base_url]
        self.seen_listing_urls = set()
        self.seen_product_urls = set()
        self.expected_total_hint = None
        self.crawled_item_count = 0

    def start_requests(self):
        for page in range(1, self.max_listing_pages + 1):
            url = self.listing_base_url if page == 1 else f"{self.listing_base_url}?p={page}"
            yield scrapy.Request(url, callback=self.parse)

    def parse(self, response):
        if response.url in self.seen_listing_urls:
            return
        self.seen_listing_urls.add(response.url)

        hint = extract_total_products_hint(response)
        if hint:
            self.expected_total_hint = max(self.expected_total_hint or 0, hint)

        links = response.css(
            ".product-item a::attr(href), "
            "a[href*='-p']::attr(href)"
        ).getall()
        for href in links:
            url = self._canonical_url(urljoin(response.url, href))
            if url in self.seen_product_urls:
                continue
            if self._is_valid_product_url(url):
                self.seen_product_urls.add(url)
                yield response.follow(url, callback=self.parse_detail)

    def _is_valid_product_url(self, url):
        parsed = urlparse(url)
        if parsed.netloc and "hoanghamobile.com" not in parsed.netloc:
            return False

        lowered_path = parsed.path.lower()
        if "/tra-gop/" in lowered_path:
            return False
        if lowered_path.rstrip("/") == urlparse(self.listing_base_url).path.rstrip("/"):
            return False

        if lowered_path.startswith("/tin-tuc") or lowered_path.startswith("/lien-he"):
            return False
        if lowered_path.startswith("/kho-san-pham-cu"):
            return False
        if "/phan-loai-san-pham/" in lowered_path:
            return False
        if lowered_path.endswith("/van-phong-sinh-vien"):
            return False

        if parsed.query and "filters=" in parsed.query.lower():
            return False

        prefixes = self.category_config.get("product_prefixes")
        if prefixes and not any(lowered_path.startswith(prefix) for prefix in prefixes):
            return False

        return True

    def _is_listing_url(self, url):
        parsed = urlparse(url)
        if parsed.netloc and "hoanghamobile.com" not in parsed.netloc:
            return False

        lowered = parsed.path.lower()
        if "/tra-gop/" in lowered:
            return False

        if "filters=" in parsed.query.lower():
            return False

        page_values = parse_qs(parsed.query).get("p")
        if page_values:
            try:
                page = int(page_values[0])
            except ValueError:
                return False
            if page < 1 or page > self.max_listing_pages:
                return False

        return urlparse(self.listing_base_url).path.lower().rstrip("/") in lowered

    def _canonical_url(self, url):
        parsed = urlparse(url)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))

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
            response.css("meta[property='product:price:amount']::attr(content)").get(),
            response.css("meta[itemprop='price']::attr(content)").get(),
            response.css(".product-price .price::text").get(),
            response.css(".price::text").get(),
        ])

        old_price = first_non_empty([
            response.css(".product-price .old-price::text").get(),
            response.css(".price-old::text").get(),
        ])

        availability = str(offers.get("availability", "")).lower()
        text_blob = " ".join(response.css("body *::text").getall()).lower()
        in_stock = True
        if "outofstock" in availability or "hết hàng" in text_blob or "tạm hết hàng" in text_blob:
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
        category_path_raw = " > ".join(breadcrumb_tokens) if breadcrumb_tokens else self.category

        self.crawled_item_count += 1

        yield PhoneItem(
            source="hoangha",
            product_id=response.url.rstrip("/").split("/")[-1],
            name=clean_space(name),
            brand=None,
            model=clean_space(name),
            variant=None,
            price=price,
            old_price=old_price,
            in_stock=in_stock,
            product_url=self._canonical_url(response.url),
            image_url=image_url,
            description=clean_space(description),
            category_path_raw=category_path_raw,
        )

    def spider_closed(self, spider, reason):
        stats = spider.crawler.stats
        stats.set_value("completeness/crawled_items", self.crawled_item_count)
        stats.set_value("completeness/listing_urls", len(self.seen_listing_urls))
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


class HoangHaPhoneSpider(HoangHaCatalogSpider):
    name = "hoangha_phone"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("category", "dien-thoai")
        super().__init__(*args, **kwargs)
