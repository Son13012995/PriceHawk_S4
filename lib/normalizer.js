/**
 * normalizer.js
 * Ported from normalizer.py — exact same logic, same output.
 * Dùng cho cả Next.js API routes và extension (background script).
 */

const BRAND_ALIASES = {
  apple: "apple", iphone: "apple", ipad: "apple", macbook: "apple",
  "mac mini": "apple", samsung: "samsung", "galaxy tab": "samsung",
  xiaomi: "xiaomi", redmi: "xiaomi", poco: "xiaomi", oppo: "oppo",
  vivo: "vivo", realme: "realme", honor: "honor", nokia: "nokia",
  tecno: "tecno", infinix: "infinix", masstel: "masstel", nubia: "nubia",
  redmagic: "nubia", itel: "itel", viettel: "viettel", mobell: "mobell",
  benco: "benco", inoi: "inoi", "tecno mobile": "tecno", lenovo: "lenovo",
  thinkpad: "lenovo", ideapad: "lenovo", asus: "asus", vivobook: "asus",
  zenbook: "asus", dell: "dell", inspiron: "dell", latitude: "dell",
  xps: "dell", hp: "hp", pavilion: "hp", victus: "hp", omen: "hp",
  acer: "acer", aspire: "acer", swift: "acer", nitro: "acer", msi: "msi",
  gigabyte: "gigabyte", huawei: "huawei", matebook: "huawei",
  surface: "microsoft", microsoft: "microsoft", chuwi: "chuwi",
  "xiaomi pad": "xiaomi",
};

const COLOR_ALIASES = {
  desert: "desert", "sa mac": "desert", titanium: "titanium",
  midnight: "black", black: "black", den: "black", white: "white",
  trang: "white", blue: "blue", "xanh duong": "blue", xanh: "blue",
  green: "green", "xanh la": "green", purple: "purple", tim: "purple",
  pink: "pink", hong: "pink", gold: "gold", vang: "gold", silver: "silver",
  bac: "silver", gray: "gray", grey: "gray", xam: "gray", navy: "navy",
  mint: "mint",
};

const NOISE_PHRASES = new Set([
  "dien thoai", "chinh hang", "newseal", "tra gop",
  "khuyen mai", "bao hanh", "qua tang",
]);

// ─── Unicode → ASCII (Vietnamese safe) ────────────────────────────────────────
function toAsciiLower(text) {
  if (!text) return "";
  text = text.replace(/Đ/g, "D").replace(/đ/g, "d");
  // NFKD decompose → remove combining diacritics (matches Python unicodedata.normalize("NFKD"))
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(text) {
  if (!text) return null;
  text = text.replace(/[^a-z0-9\s-]/g, " ");
  text = normalizeSpaces(text);
  return text ? text.replace(/\s+/g, "-") : null;
}

function normalizeBrand(brandText) {
  if (!brandText) return null;
  // Iterate in insertion order — mirrors Python's `for alias, norm in BRAND_ALIASES.items()`
  for (const alias of Object.keys(BRAND_ALIASES)) {
    const re = new RegExp(`\\b${escapeRegex(alias)}\\b`);
    if (re.test(brandText)) return BRAND_ALIASES[alias];
  }
  return null;
}

function inferBrand(nameText) {
  return normalizeBrand(nameText);
}

function extractColor(text) {
  const keys = Object.keys(COLOR_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const re = new RegExp(`\\b${escapeRegex(key)}\\b`);
    if (re.test(text)) return COLOR_ALIASES[key];
  }
  return null;
}

function extractMemory(text) {
  let ram = null, rom = null;

  // pair: 8/256
  const pairMatch = text.match(/\b(\d{1,2})\s*\/\s*(\d{2,4})\b/);
  if (pairMatch) {
    ram = `${parseInt(pairMatch[1])}g`;
    rom = formatCapacity(pairMatch[2], "g");
  }

  // explicit RAM: ram 8gb
  const ramMatch = text.match(/\bram\s*(\d{1,2})\s*(g|gb)\b/);
  if (ramMatch) ram = `${parseInt(ramMatch[1])}g`;

  // all capacity tokens
  const allCaps = [];
  const capRe = /\b(\d{1,4})\s*(tb|t|gb|g)\b/g;
  let m;
  while ((m = capRe.exec(text)) !== null) {
    const value = parseInt(m[1]);
    const unit = m[2];
    if (unit === "g" && value <= 5) continue; // skip 4G/5G network
    allCaps.push({ value, unit });
  }

  if (!rom && allCaps.length > 0) {
    const largest = allCaps.reduce((a, b) =>
      toBytes(a) >= toBytes(b) ? a : b
    );
    rom = formatCapacity(largest.value, largest.unit);
  }

  if (!ram && allCaps.length >= 2) {
    const smallest = allCaps.reduce((a, b) =>
      toBytes(a) <= toBytes(b) ? a : b
    );
    if (smallest.value <= 24 && ["g", "gb"].includes(smallest.unit)) {
      ram = `${smallest.value}g`;
    }
  }

  return [ram, rom];
}

function toBytes({ value, unit }) {
  return ["tb", "t"].includes(unit) ? value * 1024 : value;
}

function formatCapacity(value, unit) {
  value = parseInt(value);
  if (["tb", "t"].includes(unit)) return `${value}t`;
  return `${value}g`;
}

function removeNoise(text) {
  let cleaned = text;
  for (const phrase of NOISE_PHRASES) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(phrase)}\\b`, "g"), " ");
  }
  return normalizeSpaces(cleaned);
}

function removeLaptopNoise(text) {
  let cleaned = text;
  for (const phrase of ["laptop", "notebook", "ultrabook", "gaming"]) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(phrase)}\\b`, "g"), " ");
  }
  return normalizeSpaces(cleaned);
}

function removeTabletNoise(text) {
  let cleaned = text;
  for (const phrase of ["tablet", "may tinh bang"]) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(phrase)}\\b`, "g"), " ");
  }
  return normalizeSpaces(cleaned);
}

function removeMemoryTokens(text) {
  text = text.replace(/\b\d{1,2}\s*\/\s*\d{2,4}\b/g, " ");
  text = text.replace(/\bram\s*\d{1,2}\s*(g|gb)\b/g, " ");
  text = text.replace(/\b\d{1,4}\s*(tb|t|gb)\b/g, " ");
  return normalizeSpaces(text);
}

function removeColorTokens(text, color) {
  const synonyms = Object.keys(COLOR_ALIASES).filter(k => COLOR_ALIASES[k] === color);
  let cleaned = text;
  for (const word of synonyms) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, "g"), " ");
  }
  return normalizeSpaces(cleaned);
}

function isLaptopCategory(cat) {
  return ["laptop", "may-tinh-xach-tay", "notebook"].some(t => cat.includes(t));
}

function isTabletCategory(cat) {
  return ["tablet", "may-tinh-bang", "ipad", "galaxy-tab"].some(t => cat.includes(t));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Public API ───────────────────────────────────────────────────────────────

function normalizePhoneIdentity(name, brand = null) {
  const nameRaw = toAsciiLower(name || "");
  const brandRaw = toAsciiLower(brand || "");

  let brandNorm = normalizeBrand(brandRaw) || inferBrand(nameRaw);

  let cleaned = normalizeSpaces(nameRaw);
  const color = extractColor(cleaned);
  const [ram, rom] = extractMemory(cleaned);

  let core = removeNoise(cleaned);
  core = removeMemoryTokens(core);
  if (color) core = removeColorTokens(core, color);

  if (brandNorm) {
    core = core.replace(new RegExp(`\\b${escapeRegex(brandNorm)}\\b`, "g"), " ");
    if (brandNorm === "apple") core = core.replace(/\biphone\b/g, "iphone");
  }

  core = normalizeSpaces(core);
  const coreSlug = slugify(core);
  const modelKey = brandNorm && coreSlug ? `${brandNorm}-${coreSlug}` : coreSlug || null;

  const variantKey = `ram-${ram || "na"}_rom-${rom || "na"}_color-${color || "na"}`;
  const normalizeName = modelKey ? `${brandNorm || ""}_${modelKey}_${variantKey}` : null;

  let confidence = 0.35;
  if (brandNorm) confidence += 0.2;
  if (modelKey) confidence += 0.25;
  if (rom) confidence += 0.1;
  if (ram) confidence += 0.05;
  if (color) confidence += 0.05;

  return { brandNorm, modelKey, variantKey, normalizeName, confidenceScore: Math.min(Math.round(confidence * 100) / 100, 1.0), ramNorm: ram, romNorm: rom, colorNorm: color };
}

function normalizeLaptopIdentity(name, brand = null) {
  const nameRaw = toAsciiLower(name || "");
  const brandRaw = toAsciiLower(brand || "");

  let brandNorm = normalizeBrand(brandRaw) || inferBrand(nameRaw);

  let cleaned = normalizeSpaces(nameRaw);
  const [ram, rom] = extractMemory(cleaned);

  let core = removeNoise(cleaned);
  core = removeMemoryTokens(core);
  core = removeLaptopNoise(core);

  if (brandNorm) {
    core = core.replace(new RegExp(`\\b${escapeRegex(brandNorm)}\\b`, "g"), " ");
  }

  core = normalizeSpaces(core);
  const coreSlug = slugify(core);
  const modelKey = brandNorm && coreSlug ? `${brandNorm}-${coreSlug}` : coreSlug || null;

  const variantKey = `ram-${ram || "na"}_rom-${rom || "na"}`;
  const normalizeName = modelKey ? `${brandNorm || ""}_${modelKey}_${variantKey}` : null;

  let confidence = 0.35;
  if (brandNorm) confidence += 0.25;
  if (modelKey) confidence += 0.3;
  if (rom) confidence += 0.08;
  if (ram) confidence += 0.02;

  return { brandNorm, modelKey, variantKey, normalizeName, confidenceScore: Math.min(Math.round(confidence * 100) / 100, 1.0), ramNorm: ram, romNorm: rom, colorNorm: null };
}

function normalizeTabletIdentity(name, brand = null) {
  const nameRaw = toAsciiLower(name || "");
  const brandRaw = toAsciiLower(brand || "");

  let brandNorm = normalizeBrand(brandRaw) || inferBrand(nameRaw);

  let cleaned = normalizeSpaces(nameRaw);
  const color = extractColor(cleaned);
  const [ram, rom] = extractMemory(cleaned);

  let core = removeNoise(cleaned);
  core = removeMemoryTokens(core);
  core = removeTabletNoise(core);
  if (color) core = removeColorTokens(core, color);

  if (brandNorm) {
    core = core.replace(new RegExp(`\\b${escapeRegex(brandNorm)}\\b`, "g"), " ");
  }

  core = normalizeSpaces(core);
  const coreSlug = slugify(core);
  const modelKey = brandNorm && coreSlug ? `${brandNorm}-${coreSlug}` : coreSlug || null;

  const variantKey = `ram-${ram || "na"}_rom-${rom || "na"}_color-${color || "na"}`;
  const normalizeName = modelKey ? `${brandNorm || ""}_${modelKey}_${variantKey}` : null;

  let confidence = 0.35;
  if (brandNorm) confidence += 0.2;
  if (modelKey) confidence += 0.25;
  if (rom) confidence += 0.1;
  if (ram) confidence += 0.05;
  if (color) confidence += 0.05;

  return { brandNorm, modelKey, variantKey, normalizeName, confidenceScore: Math.min(Math.round(confidence * 100) / 100, 1.0), ramNorm: ram, romNorm: rom, colorNorm: color };
}

/**
 * Main entry — mirrors normalize_identity_by_category()
 */
function normalizeIdentityByCategory(name, brand = null, category = null) {
  const catRaw = toAsciiLower(category || "");
  if (isLaptopCategory(catRaw)) return normalizeLaptopIdentity(name, brand);
  if (isTabletCategory(catRaw)) return normalizeTabletIdentity(name, brand);
  return normalizePhoneIdentity(name, brand);
}

module.exports = {
  normalizeIdentityByCategory,
  normalizePhoneIdentity,
  normalizeLaptopIdentity,
  normalizeTabletIdentity,
  toAsciiLower,
};