import re
from datetime import datetime, timezone

from itemadapter import ItemAdapter

from price_hawk.normalizer import normalize_identity_by_category


class NormalizePhonePipeline:
    def process_item(self, item, spider=None):
        adapter = ItemAdapter(item)
        adapter["source"] = (adapter.get("source") or "").strip().lower()
        adapter["name"] = clean_text(adapter.get("name"))
        adapter["brand"] = clean_text(adapter.get("brand"))
        adapter["model"] = clean_text(adapter.get("model"))
        adapter["variant"] = clean_text(adapter.get("variant"))
        adapter["currency"] = "VND"
        adapter["price"] = parse_price(adapter.get("price"))

        if adapter.get("in_stock") is None:
            adapter["in_stock"] = True

        adapter["product_url"] = clean_text(adapter.get("product_url"))
        adapter["image_url"] = clean_text(adapter.get("image_url"))
        adapter["description"] = clean_text(adapter.get("description"))
        adapter["category_path_raw"] = clean_text(adapter.get("category_path_raw"))

        identity_text = " ".join(
            [
                adapter.get("name") or "",
                adapter.get("variant") or "",
            ]
        ).strip()
        norm = normalize_identity_by_category(
            identity_text,
            adapter.get("brand"),
            adapter.get("category_path_raw"),
        )
        adapter["brand_norm"] = clean_text(norm.get("brand_norm"))
        adapter["model_key"] = clean_text(norm.get("model_key"))
        adapter["variant_key"] = clean_text(norm.get("variant_key")) or "na"
        if adapter.get("model_key"):
            adapter["normalize_name"] = f"{adapter.get('model_key')}__{adapter.get('variant_key')}"
        else:
            adapter["normalize_name"] = clean_text(norm.get("normalize_name"))

        if not adapter.get("brand") and adapter.get("brand_norm"):
            adapter["brand"] = adapter.get("brand_norm")

        # Keep RAM and ROM as separate fields
        adapter["ram"] = adapter.get("ram_norm")
        adapter["rom"] = adapter.get("rom_norm")

        if "old_price" in adapter:
            del adapter["old_price"]
        if "color_norm" in adapter:
            del adapter["color_norm"]
        if "ram_norm" in adapter:
            del adapter["ram_norm"]
        if "rom_norm" in adapter:
            del adapter["rom_norm"]

        if not adapter.get("scraped_at"):
            adapter["scraped_at"] = datetime.now(timezone.utc).isoformat()

        # Keep a stable minimal contract for downstream DB insertion.
        allowed_fields = {
            "source",
            "product_url",
            "name",
            "brand_norm",
            "model_key",
            "variant_key",
            "normalize_name",
            "price",
            "in_stock",
            "scraped_at",
            "image_url",
            "description",
            "ram",
            "rom",
        }
        for key in list(adapter.keys()):
            if key not in allowed_fields:
                del adapter[key]

        return item


def clean_text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def parse_price(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)

    s = str(value)
    digits = re.sub(r"[^0-9]", "", s)
    if not digits:
        return None

    try:
        return int(digits)
    except ValueError:
        return None

