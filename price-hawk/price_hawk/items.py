import scrapy


class PhoneItem(scrapy.Item):
    source = scrapy.Field()
    product_id = scrapy.Field()
    name = scrapy.Field()
    brand = scrapy.Field()
    model = scrapy.Field()
    variant = scrapy.Field()
    price = scrapy.Field()
    old_price = scrapy.Field()
    currency = scrapy.Field()
    in_stock = scrapy.Field()
    product_url = scrapy.Field()
    image_url = scrapy.Field()
    description = scrapy.Field()
    category_path_raw = scrapy.Field()
    scraped_at = scrapy.Field()

    brand_norm = scrapy.Field()
    model_key = scrapy.Field()
    variant_key = scrapy.Field()
    normalize_name = scrapy.Field()
    confidence_score = scrapy.Field()
    color_norm = scrapy.Field()
