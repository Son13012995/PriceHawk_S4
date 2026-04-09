from urllib.parse import urljoin

import scrapy
from scrapy import signals

from price_hawk.items import PhoneItem
from price_hawk.spiders.utils import clean_space, extract_image_url, extract_json_ld_product, first_non_empty


class FptCatalogSpider(scrapy.Spider):
    name = "fpt_catalog"
    allowed_domains = ["fptshop.com.vn"]
    CATEGORY_CONFIG = {
        "dien-thoai": {
            "sitemap_url": "https://fptshop.com.vn/products/sitemap-dien-thoai.xml",
            "path_prefix": "/dien-thoai/",
        },
        "laptop": {
            "sitemap_url": "https://fptshop.com.vn/products/sitemap-may-tinh-xach-tay.xml",
            "path_prefix": "/may-tinh-xach-tay/",
        },
        "may-tinh-xach-tay": {
            "sitemap_url": "https://fptshop.com.vn/products/sitemap-may-tinh-xach-tay.xml",
            "path_prefix": "/may-tinh-xach-tay/",
        },
        "tablet": {
            "sitemap_url": "https://fptshop.com.vn/products/sitemap-may-tinh-bang.xml",
            "path_prefix": "/may-tinh-bang/",
        },
        "may-tinh-bang": {
            "sitemap_url": "https://fptshop.com.vn/products/sitemap-may-tinh-bang.xml",
            "path_prefix": "/may-tinh-bang/",
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
        self.start_urls = [self.category_config["sitemap_url"]]
        self.seen_product_urls = set()
        self.expected_total_hint = None
        self.crawled_item_count = 0

    def parse(self, response):
        links = response.xpath("//*[local-name()='url']/*[local-name()='loc']/text()").getall()
        self.expected_total_hint = len(links) or self.expected_total_hint

        for href in links:
            url = urljoin(response.url, href.strip())
            if not self._is_category_product_url(url):
                continue
            if url in self.seen_product_urls:
                continue

            self.seen_product_urls.add(url)
            yield response.follow(url, callback=self.parse_detail)

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
            response.css(".st-price-main::text").get(),
            response.css(".price::text").get(),
        ])

        old_price = first_non_empty([
            response.css(".st-price-sub::text").get(),
            response.css(".st-price-regular::text").get(),
        ])

        availability = str(offers.get("availability", "")).lower()
        text_blob = " ".join(response.css("body *::text").getall()).lower()
        in_stock = True
        if "outofstock" in availability or "hết hàng" in text_blob:
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

        brand = first_non_empty([
            ld_product.get("brand") if isinstance(ld_product, dict) else None,
            response.css("meta[property='product:brand']::attr(content)").get(),
        ])
        if isinstance(brand, dict):
            brand = first_non_empty([brand.get("name")])

        self.crawled_item_count += 1

        yield PhoneItem(
            source="fpt",
            product_id=response.url.rstrip("/").split("/")[-1],
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

    def spider_closed(self, spider, reason):
        stats = spider.crawler.stats
        stats.set_value("completeness/crawled_items", self.crawled_item_count)
        stats.set_value("completeness/expected_hint", self.expected_total_hint)
        stats.set_value("completeness/sitemap_urls", len(self.seen_product_urls))
        stats.set_value("completeness/category", self.category)

    def _is_category_product_url(self, url):
        lowered = url.lower()
        return lowered.startswith(f"https://fptshop.com.vn{self.category_config['path_prefix']}")


class FptPhoneSpider(FptCatalogSpider):
    name = "fpt_phone"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("category", "dien-thoai")
        super().__init__(*args, **kwargs)
