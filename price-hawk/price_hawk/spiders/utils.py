import json
import re


def clean_space(text):
    if not text:
        return None
    return re.sub(r"\s+", " ", text).strip()


def extract_json_ld_product(response):
    for raw in response.css('script[type="application/ld+json"]::text').getall():
        if not raw or not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue

        product = _find_product(data)
        if product:
            return product
    return {}


def _find_product(node):
    if isinstance(node, dict):
        type_value = node.get("@type")
        if type_value == "Product" or (isinstance(type_value, list) and "Product" in type_value):
            return node

        for value in node.values():
            result = _find_product(value)
            if result:
                return result

    if isinstance(node, list):
        for item in node:
            result = _find_product(item)
            if result:
                return result

    return None


def first_non_empty(values):
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            cleaned = clean_space(value)
            if cleaned:
                return cleaned
        else:
            return value
    return None


def extract_image_url(value):
    if value is None:
        return None

    if isinstance(value, list):
        for item in value:
            url = extract_image_url(item)
            if url:
                return url
        return None

    if isinstance(value, dict):
        return first_non_empty([
            value.get("url"),
            value.get("contentUrl"),
        ])

    if isinstance(value, str):
        return clean_space(value)

    return None


def extract_total_products_hint(response):
    text_blob = " ".join(response.css("body *::text").getall())
    text_blob = clean_space(text_blob) or ""
    lowered = text_blob.lower()

    patterns = [
        r"xem\s+th[ea]m\s+([\d\.,]+)\s+sản\s+phẩm",
        r"([\d\.,]+)\s+k[ếe]t\s+quả",
        r"t[ổo]ng\s+([\d\.,]+)\s+sản\s+phẩm",
    ]

    hints = []
    for pattern in patterns:
        for match in re.findall(pattern, lowered, flags=re.IGNORECASE):
            value = _to_int(match)
            if value and value > 0:
                hints.append(value)

    return max(hints) if hints else None


def _to_int(text):
    digits = re.sub(r"[^0-9]", "", str(text))
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None
