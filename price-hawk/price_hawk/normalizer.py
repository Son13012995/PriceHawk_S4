import re
import unicodedata
import html


BRAND_ALIASES = {
    "apple": "apple",
    "iphone": "apple",
    "ipad": "apple",
    "macbook": "apple",
    "mac mini": "apple",
    "samsung": "samsung",
    "galaxy tab": "samsung",
    "xiaomi": "xiaomi",
    "redmi": "xiaomi",
    "poco": "xiaomi",
    "oppo": "oppo",
    "vivo": "vivo",
    "realme": "realme",
    "honor": "honor",
    "nokia": "nokia",
    "tecno": "tecno",
    "infinix": "infinix",
    "masstel": "masstel",
    "nubia": "nubia",
    "redmagic": "nubia",
    "itel": "itel",
    "viettel": "viettel",
    "mobell": "mobell",
    "benco": "benco",
    "inoi": "inoi",
    "tecno mobile": "tecno",
    "lenovo": "lenovo",
    "thinkpad": "lenovo",
    "ideapad": "lenovo",
    "asus": "asus",
    "vivobook": "asus",
    "zenbook": "asus",
    "dell": "dell",
    "inspiron": "dell",
    "latitude": "dell",
    "xps": "dell",
    "hp": "hp",
    "pavilion": "hp",
    "victus": "hp",
    "omen": "hp",
    "acer": "acer",
    "aspire": "acer",
    "swift": "acer",
    "nitro": "acer",
    "msi": "msi",
    "gigabyte": "gigabyte",
    "huawei": "huawei",
    "matebook": "huawei",
    "surface": "microsoft",
    "microsoft": "microsoft",
    "chuwi": "chuwi",
    "masstel": "masstel",
    "xiaomi pad": "xiaomi",
    "motorola": "motorola",
    "moto": "motorola",
    "tcl": "tcl",
    "hera": "hera",
    "xphone": "hera",
    "htc": "htc",
    "sony": "sony",
    "reno": "oppo",
    "find": "oppo",
    "oscal": "oscal",
    "zte": "zte",
    "redmi": "xiaomi",
    "poco": "xiaomi",
    "mi ": "xiaomi",
    "galaxy": "samsung",
    "tab ": "samsung",
    "ipad": "apple",
    "macbook": "apple",
    "iphone": "apple",
    "thinkpad": "lenovo",
    "ideapad": "lenovo",
    "vivobook": "asus",
    "zenbook": "asus",
    "inspiron": "dell",
    "latitude": "dell",
    "xps": "dell",
    "pavilion": "hp",
    "victus": "hp",
    "omen": "hp",
    "aspire": "acer",
    "swift": "acer",
    "nitro": "acer",
    "predator": "acer",
    "matebook": "huawei",
    "surface": "microsoft",
    "lg gram": "lg",
    "gram": "lg",
}

COLOR_ALIASES = {
    "desert": "desert",
    "sa mac": "desert",
    "titanium": "titanium",
    "midnight": "black",
    "black": "black",
    "den": "black",
    "white": "white",
    "trang": "white",
    "blue": "blue",
    "xanh duong": "blue",
    "xanh": "blue",
    "green": "green",
    "xanh la": "green",
    "purple": "purple",
    "tim": "purple",
    "pink": "pink",
    "hong": "pink",
    "gold": "gold",
    "vang": "gold",
    "silver": "silver",
    "bac": "silver",
    "gray": "gray",
    "grey": "gray",
    "xam": "gray",
    "navy": "navy",
    "mint": "mint",
}

NOISE_PHRASES = {
    "dien thoai",
    "chinh hang",
    "newseal",
    "tra gop",
    "khuyen mai",
    "bao hanh",
    "qua tang",
    "vn/a",
    "vna",
}


def normalize_identity_by_category(name, brand=None, category=None):
    category_raw = to_ascii_lower(category or "")
    if is_laptop_category(category_raw):
        return normalize_laptop_identity(name, brand)
    if is_tablet_category(category_raw):
        return normalize_tablet_identity(name, brand)
    return normalize_phone_identity(name, brand)


def normalize_phone_identity(name, brand=None):
    name_raw = to_ascii_lower(name or "")
    brand_raw = to_ascii_lower(brand or "")

    brand_norm = normalize_brand(brand_raw)
    if not brand_norm:
        brand_norm = infer_brand(name_raw)

    cleaned = normalize_spaces(name_raw)
    color = extract_color(cleaned)
    ram, rom = extract_memory(cleaned)

    core = remove_noise(cleaned)
    core = remove_memory_tokens(core)
    if color:
        core = remove_color_tokens(core, color)

    if brand_norm:
        core = re.sub(rf"\b{re.escape(brand_norm)}\b", " ", core)
        if brand_norm == "apple":
            core = re.sub(r"\biphone\b", "iphone", core)

    core = normalize_spaces(core)
    core_slug = slugify(core)

    if brand_norm and core_slug:
        model_key = f"{brand_norm}-{core_slug}"
    else:
        model_key = core_slug or None

    ram_key = ram or "na"
    rom_key = rom or "na"
    color_key = color or "na"
    variant_key = f"ram-{ram_key}_rom-{rom_key}_color-{color_key}"

    normalize_name = None
    if model_key:
        normalize_name = f"{model_key} {variant_key}".strip()

    confidence = 0.35
    if brand_norm:
        confidence += 0.2
    if model_key:
        confidence += 0.25
    if rom:
        confidence += 0.1
    if ram:
        confidence += 0.05
    if color:
        confidence += 0.05

    return {
        "brand_norm": brand_norm,
        "model_key": model_key,
        "variant_key": variant_key,
        "normalize_name": normalize_name,
        "confidence_score": min(round(confidence, 2), 1.0),
        "ram_norm": ram,
        "rom_norm": rom,
        "color_norm": color,
    }


def normalize_laptop_identity(name, brand=None):
    name_raw = to_ascii_lower(name or "")
    brand_raw = to_ascii_lower(brand or "")

    brand_norm = normalize_brand(brand_raw)
    if not brand_norm:
        brand_norm = infer_brand(name_raw)

    cleaned = normalize_spaces(name_raw)
    ram, rom = extract_memory(cleaned)

    core = remove_noise(cleaned)
    core = remove_memory_tokens(core)
    core = remove_laptop_noise(core)

    if brand_norm:
        core = re.sub(rf"\b{re.escape(brand_norm)}\b", " ", core)

    core = normalize_spaces(core)
    core_slug = slugify(core)

    if brand_norm and core_slug:
        model_key = f"{brand_norm}-{core_slug}"
    else:
        model_key = core_slug or None

    ram_key = ram or "na"
    rom_key = rom or "na"
    variant_key = f"ram-{ram_key}_rom-{rom_key}"

    normalize_name = None
    if model_key:
        normalize_name = f"{model_key} {variant_key}".strip()

    confidence = 0.35
    if brand_norm:
        confidence += 0.25
    if model_key:
        confidence += 0.3
    if rom:
        confidence += 0.08
    if ram:
        confidence += 0.02

    return {
        "brand_norm": brand_norm,
        "model_key": model_key,
        "variant_key": variant_key,
        "normalize_name": normalize_name,
        "confidence_score": min(round(confidence, 2), 1.0),
        "ram_norm": ram,
        "rom_norm": rom,
        "color_norm": None,
    }


def normalize_tablet_identity(name, brand=None):
    name_raw = to_ascii_lower(name or "")
    brand_raw = to_ascii_lower(brand or "")

    brand_norm = normalize_brand(brand_raw)
    if not brand_norm:
        brand_norm = infer_brand(name_raw)

    cleaned = normalize_spaces(name_raw)
    color = extract_color(cleaned)
    ram, rom = extract_memory(cleaned)

    core = remove_noise(cleaned)
    core = remove_memory_tokens(core)
    core = remove_tablet_noise(core)
    if color:
        core = remove_color_tokens(core, color)

    if brand_norm:
        core = re.sub(rf"\b{re.escape(brand_norm)}\b", " ", core)

    core = normalize_spaces(core)
    core_slug = slugify(core)

    if brand_norm and core_slug:
        model_key = f"{brand_norm}-{core_slug}"
    else:
        model_key = core_slug or None

    ram_key = ram or "na"
    rom_key = rom or "na"
    color_key = color or "na"
    variant_key = f"ram-{ram_key}_rom-{rom_key}_color-{color_key}"

    normalize_name = None
    if model_key:
        normalize_name = f"{model_key} {variant_key}".strip()

    confidence = 0.35
    if brand_norm:
        confidence += 0.2
    if model_key:
        confidence += 0.25
    if rom:
        confidence += 0.1
    if ram:
        confidence += 0.05
    if color:
        confidence += 0.05

    return {
        "brand_norm": brand_norm,
        "model_key": model_key,
        "variant_key": variant_key,
        "normalize_name": normalize_name,
        "confidence_score": min(round(confidence, 2), 1.0),
        "ram_norm": ram,
        "rom_norm": rom,
        "color_norm": color,
    }


def to_ascii_lower(text):
    if not text:
        return ""
    text = html.unescape(text)
    text = text.replace("Đ", "D").replace("đ", "d")
    normalized = unicodedata.normalize("NFKD", text)
    no_diacritic = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return no_diacritic.lower()


def normalize_spaces(text):
    return re.sub(r"\s+", " ", text).strip()


def slugify(text):
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace(" ", "-") if text else None


def normalize_brand(brand_text):
    if not brand_text:
        return None
    for alias, norm in BRAND_ALIASES.items():
        # Match alias at word boundary OR followed by digits (e.g., "reno14", "galaxy23")
        if re.search(rf"(?:^|[\s\-]){re.escape(alias)}\d*(?:[\s\-]|$)", brand_text):
            return norm
    return None


def infer_brand(name_text):
    return normalize_brand(name_text)


def extract_color(text):
    keys = sorted(COLOR_ALIASES.keys(), key=len, reverse=True)
    for key in keys:
        if re.search(rf"\b{re.escape(key)}\b", text):
            return COLOR_ALIASES[key]
    return None


def extract_memory(text):
    ram = None
    rom = None

    pair_match = re.search(r"\b(\d{1,2})\s*/\s*(\d{2,4})\b", text)
    if pair_match:
        ram = f"{int(pair_match.group(1))}g"
        rom = format_capacity(pair_match.group(2), "g")

    # Match "12GB/512GB" or "8GB+256GB" patterns
    if not pair_match:
        pair_match2 = re.search(r"\b(\d{1,2})\s*(?:gb|g)\s*[/+]\s*(\d{2,4})\s*(?:gb|g)\b", text, re.IGNORECASE)
        if pair_match2:
            ram = f"{int(pair_match2.group(1))}g"
            rom = format_capacity(pair_match2.group(2), "g")

    ram_match = re.search(r"\bram\s*(\d{1,2})\s*(g|gb)\b", text)
    if ram_match:
        ram = f"{int(ram_match.group(1))}g"

    all_caps = []
    for match in re.finditer(r"\b(\d{1,4})\s*(tb|t|gb|g)\b", text):
        value = int(match.group(1))
        unit = match.group(2)

        # Ignore mobile-network tokens like 4g/5g when they are not GB capacities.
        if unit == "g" and value <= 5:
            continue

        all_caps.append((value, unit))

    if not rom and all_caps:
        largest = max(all_caps, key=lambda x: x[0] * (1024 if x[1] in {"tb", "t"} else 1))
        rom = format_capacity(largest[0], largest[1])

    if not ram and len(all_caps) >= 2:
        smallest = min(all_caps, key=lambda x: x[0] * (1024 if x[1] in {"tb", "t"} else 1))
        if smallest[0] <= 24 and smallest[1] in {"g", "gb"}:
            ram = f"{smallest[0]}g"

    return ram, rom


def format_capacity(value, unit):
    value = int(value)
    if unit in {"tb", "t"}:
        return f"{value}t"
    return f"{value}g"


def remove_noise(text):
    cleaned = text
    for phrase in NOISE_PHRASES:
        cleaned = re.sub(rf"\b{re.escape(phrase)}\b", " ", cleaned)
    return normalize_spaces(cleaned)


def remove_laptop_noise(text):
    cleaned = text
    for phrase in ("laptop", "notebook", "ultrabook", "gaming"):
        cleaned = re.sub(rf"\b{re.escape(phrase)}\b", " ", cleaned)
    return normalize_spaces(cleaned)


def remove_tablet_noise(text):
    cleaned = text
    for phrase in ("tablet", "may tinh bang"):
        cleaned = re.sub(rf"\b{re.escape(phrase)}\b", " ", cleaned)
    return normalize_spaces(cleaned)


def remove_memory_tokens(text):
    text = re.sub(r"\b\d{1,2}\s*/\s*\d{2,4}\b", " ", text)
    text = re.sub(r"\b\d{1,2}\s*(?:gb|g)\s*[/+]\s*\d{2,4}\s*(?:gb|g)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\bram\s*\d{1,2}\s*(g|gb)\b", " ", text)
    # Remove storage capacities but keep bare 4G/5G network markers in model names.
    # Only match "tb" (not "t") to avoid removing model names like "Xiaomi 15T"
    text = re.sub(r"\b\d{1,4}\s*(tb|gb)\b", " ", text)
    return normalize_spaces(text)


def remove_color_tokens(text, color):
    synonyms = [k for k, v in COLOR_ALIASES.items() if v == color]
    cleaned = text
    for word in synonyms:
        cleaned = re.sub(rf"\b{re.escape(word)}\b", " ", cleaned)
    return normalize_spaces(cleaned)


def is_laptop_category(category_text):
    return any(token in category_text for token in ("laptop", "may-tinh-xach-tay", "notebook"))


def is_tablet_category(category_text):
    return any(token in category_text for token in ("tablet", "may-tinh-bang", "ipad", "galaxy-tab"))
