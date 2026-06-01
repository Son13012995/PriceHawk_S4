/**
 * popup/popup.js — PriceHawk Scanner
 * Features: currency selector + auto-convert to VND, comparison list with links
 */

// ── DOM refs ────────────────────────────────────────────────────────────────
const statusBadge       = document.getElementById("status-badge");
const statusText        = document.getElementById("status-text");
const nameDisplay       = document.getElementById("name-display");
const priceDisplay      = document.getElementById("price-display");
const nameRow           = document.getElementById("name-row");
const priceRow          = document.getElementById("price-row");
const btnPickName       = document.getElementById("btn-pick-name");
const btnPickPrice      = document.getElementById("btn-pick-price");
const btnCompare        = document.getElementById("btn-compare");
const compareLabel      = document.getElementById("compare-label");
const compareSpinner    = document.getElementById("compare-spinner");
const pickerHint        = document.getElementById("picker-hint");
const hintText          = document.getElementById("hint-text");
const btnCancelPick     = document.getElementById("btn-cancel-pick");
const scanSection       = document.getElementById("scan-section");
const resultSection     = document.getElementById("result-section");
const verdictBanner     = document.getElementById("verdict-banner");
const verdictIcon       = document.getElementById("verdict-icon");
const verdictTitle      = document.getElementById("verdict-title");
const verdictSub        = document.getElementById("verdict-sub");
const statsGrid         = document.getElementById("stats-grid");
const detailSection     = document.getElementById("detail-section");
const btnReset          = document.getElementById("btn-reset");
const categorySelect    = document.getElementById("category-select");
const currencySelect    = document.getElementById("currency-select");
const rateBadge         = document.getElementById("rate-badge");
const comparisonSection = document.getElementById("comparison-section");
const comparisonList    = document.getElementById("comparison-list");

// ── State ───────────────────────────────────────────────────────────────────
let state = {
  rawName:    null,
  price:      null,      // raw parsed number from page (in original currency)
  priceVND:   null,      // converted to VND for API
  priceRaw:   null,
  picking:    null,
  sourceUrl:  null,
  category:   "dien-thoai",
  currency:   "VND",
  rateToVND:  1,         // 1 unit of selected currency = X VND
};

// ── Currency conversion (frankfurter.app — free, no API key) ────────────────
const RATE_CACHE_TTL = 30 * 60 * 1000; // 30 min
let rateCache = {};  // { "USD": { rate: 25000, ts: Date.now() } }

async function fetchRateToVND(currency) {
  if (currency === "VND") return 1;

  const cached = rateCache[currency];
  if (cached && Date.now() - cached.ts < RATE_CACHE_TTL) return cached.rate;

  try {
    // frankfurter returns rates FROM the base currency
    // e.g. /latest?from=USD&to=VND
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=VND`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.VND;
    if (!rate) throw new Error("No VND rate");
    rateCache[currency] = { rate, ts: Date.now() };
    return rate;
  } catch (err) {
    console.warn("[PH] Rate fetch failed:", err.message);
    return null;
  }
}

function showRateBadge(currency, rate) {
  if (currency === "VND") {
    rateBadge.classList.add("hidden");
    return;
  }
  rateBadge.textContent = `1 ${currency} ≈ ${formatVND(rate)}`;
  rateBadge.classList.remove("hidden");
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatVND(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
}

function formatCurrency(n, currency) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" || currency === "JPY" || currency === "KRW" ? 0 : 2,
    }).format(n);
  } catch {
    return n.toLocaleString() + " " + currency;
  }
}

function formatDiff(diff) {
  if (diff == null) return "—";
  const sign = diff > 0 ? "+" : "";
  return sign + new Intl.NumberFormat("vi-VN").format(diff) + " ₫";
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(mode, label) {
  statusBadge.className = `status-badge ${mode}`;
  statusText.textContent = label;
}

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => resolve(resp || {}));
  });
}

function updateCompareBtn() {
  btnCompare.disabled = !(state.rawName && state.priceVND !== null);
}

function setPriceDisplay() {
  if (state.price === null) {
    priceDisplay.textContent = "Not selected";
    priceDisplay.classList.add("empty");
    return;
  }
  const origStr = formatCurrency(state.price, state.currency);
  const vndStr  = state.currency !== "VND" ? ` → ${formatVND(state.priceVND)}` : "";
  priceDisplay.textContent = origStr + vndStr;
  priceDisplay.classList.remove("empty");
}

function setPickerUI(mode) {
  state.picking = mode;
  if (mode) {
    pickerHint.classList.remove("hidden");
    hintText.textContent = mode === "name"
      ? "Click the product name on the page"
      : "Click the price on the page";
    setStatus("picking", "Picking…");
    btnPickName.disabled  = true;
    btnPickPrice.disabled = true;
    btnCompare.disabled   = true;
    if (mode === "name")  nameRow.classList.add("active");
    if (mode === "price") priceRow.classList.add("active");
  } else {
    pickerHint.classList.add("hidden");
    setStatus("idle", "Ready");
    btnPickName.disabled  = false;
    btnPickPrice.disabled = false;
    nameRow.classList.remove("active");
    priceRow.classList.remove("active");
    updateCompareBtn();
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Comparison list renderer ──────────────────────────────────────────────────
function renderComparisons(comparisons) {
  if (!comparisons || comparisons.length === 0) {
    comparisonSection.classList.add("hidden");
    return;
  }

  comparisonList.innerHTML = "";

  // Sort by price ASC (cheapest first)
  const sorted = [...comparisons].sort((a, b) => (a.price || 0) - (b.price || 0));
  const minPrice = sorted[0]?.price;
  const maxPrice = sorted[sorted.length - 1]?.price;

  sorted.forEach((item, idx) => {
    const isBest  = item.price === minPrice;
    const isWorst = item.price === maxPrice && sorted.length > 1;

    const card = document.createElement("a");
    card.className = "comparison-card";
    card.href = item.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    if (!item.url) card.style.cursor = "default";

    const rankEl = document.createElement("div");
    rankEl.className = `comp-rank${isBest ? " best" : ""}`;
    rankEl.textContent = isBest ? "★" : `${idx + 1}`;

    const bodyEl = document.createElement("div");
    bodyEl.className = "comp-body";

    const nameEl = document.createElement("div");
    nameEl.className = "comp-name";
    nameEl.textContent = item.name || "Unknown Retailer";

    const updatedEl = document.createElement("div");
    updatedEl.className = "comp-updated";
    updatedEl.textContent = formatRelativeDate(item.current_price_at);

    bodyEl.appendChild(nameEl);
    bodyEl.appendChild(updatedEl);

    const priceWrap = document.createElement("div");
    priceWrap.className = "comp-price-wrap";

    const priceEl = document.createElement("div");
    priceEl.className = `comp-price${isBest ? " best" : isWorst ? " worst" : ""}`;
    priceEl.textContent = formatVND(item.price);

    const arrowEl = document.createElement("span");
    arrowEl.className = "comp-arrow";
    arrowEl.textContent = "→";

    priceWrap.appendChild(priceEl);

    card.appendChild(rankEl);
    card.appendChild(bodyEl);
    card.appendChild(priceWrap);
    if (item.url) card.appendChild(arrowEl);

    comparisonList.appendChild(card);
  });

  comparisonSection.classList.remove("hidden");
}

// ── Result renderer ──────────────────────────────────────────────────────────
function renderResult(data) {
  if (data.found) {
    const diff = data.priceDiff;
    const diffClass = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const diffLabel = diff > 0 ? "More expensive" : diff < 0 ? "Cheaper" : "Same price";

    verdictBanner.className = "verdict-banner match";
    verdictIcon.className   = "verdict-icon match";
    verdictIcon.textContent = "✓";
    verdictTitle.className  = "verdict-title match";
    verdictTitle.textContent= "Matched";
    verdictSub.textContent  = "Found in PriceHawk database";

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">DB Price</div>
        <div class="stat-value big">${formatVND(data.matchedProduct?.price)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Your Price</div>
        <div class="stat-value big">${formatVND(data.currentPrice)}</div>
      </div>
      <div class="stat-card" style="grid-column:1/-1">
        <div class="stat-label">Difference</div>
        <div class="stat-value ${diffClass}">${formatDiff(diff)}</div>
        <div class="diff-pill ${diffClass}">${diff > 0 ? "↑" : diff < 0 ? "↓" : "="} ${diffLabel}</div>
      </div>
    `;

    detailSection.innerHTML = `
      <div class="detail-row">
        <span class="detail-key">DB Product</span>
        <span class="detail-val">${escapeHtml(data.matchedProduct?.name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Identity Key</span>
        <span class="detail-val" style="font-family:var(--mono);font-size:10px">${escapeHtml(data.identityKey)}</span>
      </div>
    `;

    // Fetch comparison list for matched product
    if (data.matchedProduct?.id) {
      fetchComparisons(data.matchedProduct.id);
    }
  } else {
    const conf = ((data.normalizedResult?.confidenceScore || 0) * 100).toFixed(0);

    verdictBanner.className = "verdict-banner nomatch";
    verdictIcon.className   = "verdict-icon nomatch";
    verdictIcon.textContent = "?";
    verdictTitle.className  = "verdict-title nomatch";
    verdictTitle.textContent= "Not Found";
    verdictSub.textContent  = "No match in database";

    statsGrid.innerHTML = `
      <div class="stat-card" style="grid-column:1/-1">
        <div class="stat-label">Confidence</div>
        <div class="stat-value">${conf}%</div>
      </div>
    `;

    detailSection.innerHTML = `
      <div class="detail-row">
        <span class="detail-key">Scanned Name</span>
        <span class="detail-val">${escapeHtml(state.rawName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Identity Key</span>
        <span class="detail-val" style="font-family:var(--mono);font-size:10px">${escapeHtml(data.identityKey || "—")}</span>
      </div>
    `;

    comparisonSection.classList.add("hidden");
  }
}

// ── Fetch comparison data from /api/compare?id= ──────────────────────────────
async function fetchComparisons(productId) {
  try {
    const resp = await send({ type: "FETCH_COMPARISONS", productId });
    if (resp.ok && resp.comparison?.length > 0) {
      renderComparisons(resp.comparison);
    }
  } catch (err) {
    console.warn("[PH] fetchComparisons failed:", err);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get([
    "selectedName", "selectedPrice", "selectedPriceRaw",
    "selectedCategory", "selectedCurrency",
  ]);

  if (stored.selectedName) {
    state.rawName = stored.selectedName;
    nameDisplay.textContent = stored.selectedName;
    nameDisplay.classList.remove("empty");
    nameRow.classList.add("done");
  }

  const savedCurrency = stored.selectedCurrency || "VND";
  state.currency = savedCurrency;
  currencySelect.value = savedCurrency;

  if (stored.selectedPrice != null) {
    state.price    = stored.selectedPrice;
    state.priceRaw = stored.selectedPriceRaw || null;
    // Restore priceVND
    if (savedCurrency === "VND") {
      state.priceVND = stored.selectedPrice;
      state.rateToVND = 1;
    } else {
      // Re-fetch rate on load if non-VND
      const rate = await fetchRateToVND(savedCurrency);
      if (rate) {
        state.rateToVND = rate;
        state.priceVND  = Math.round(state.price * rate);
        showRateBadge(savedCurrency, rate);
      } else {
        state.priceVND = null; // can't convert
      }
    }
    priceRow.classList.add("done");
    setPriceDisplay();
  }

  if (stored.selectedCategory) {
    state.category = stored.selectedCategory;
    categorySelect.value = stored.selectedCategory;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.sourceUrl = tab?.url || "";

  updateCompareBtn();
}

init();

// ── Currency change ──────────────────────────────────────────────────────────
currencySelect.addEventListener("change", async () => {
  const currency = currencySelect.value;
  state.currency = currency;
  chrome.storage.local.set({ selectedCurrency: currency });

  rateBadge.classList.add("hidden");

  if (state.price === null) return;

  if (currency === "VND") {
    state.rateToVND = 1;
    state.priceVND  = state.price;
    rateBadge.classList.add("hidden");
  } else {
    setStatus("loading", "Fetching rate…");
    const rate = await fetchRateToVND(currency);
    setStatus("idle", "Ready");
    if (rate) {
      state.rateToVND = rate;
      state.priceVND  = Math.round(state.price * rate);
      showRateBadge(currency, rate);
    } else {
      state.priceVND = null;
      rateBadge.textContent = "Rate unavailable";
      rateBadge.classList.remove("hidden");
    }
  }

  setPriceDisplay();
  updateCompareBtn();
});

// ── Category change ──────────────────────────────────────────────────────────
categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  chrome.storage.local.set({ selectedCategory: state.category });
});

// ── Pick buttons ──────────────────────────────────────────────────────────────
btnPickName.addEventListener("click", async () => {
  setPickerUI("name");
  await send({ type: "START_PICKER", mode: "name" });
});

btnPickPrice.addEventListener("click", async () => {
  setPickerUI("price");
  await send({ type: "START_PICKER", mode: "price" });
});

btnCancelPick.addEventListener("click", async () => {
  await send({ type: "STOP_PICKER" });
  setPickerUI(null);
});

// ── Compare button ────────────────────────────────────────────────────────────
btnCompare.addEventListener("click", async () => {
  if (!state.rawName || state.priceVND === null) return;

  setStatus("loading", "Comparing…");
  compareLabel.textContent = "Comparing…";
  compareSpinner.classList.remove("hidden");
  btnCompare.disabled = true;

  const resp = await send({
    type: "COMPARE",
    name: state.rawName,
    price: state.priceVND,   // always send VND to API
    sourceUrl: state.sourceUrl,
    category: state.category,
  });

  compareLabel.textContent = "Compare Price";
  compareSpinner.classList.add("hidden");

  if (!resp.ok) {
    setStatus("error", "Error");
    verdictBanner.className = "verdict-banner nomatch";
    verdictIcon.className   = "verdict-icon nomatch";
    verdictIcon.textContent = "!";
    verdictTitle.className  = "verdict-title nomatch";
    verdictTitle.textContent= "API Error";
    verdictSub.textContent  = resp.error || "Unknown error";
    statsGrid.innerHTML     = "";
    detailSection.innerHTML = "";
    comparisonSection.classList.add("hidden");
    showResult();
    return;
  }

  setStatus(resp.data.found ? "success" : "error", resp.data.found ? "Matched" : "Not Found");
  renderResult(resp.data);
  showResult();
});

// ── Reset ─────────────────────────────────────────────────────────────────────
btnReset.addEventListener("click", async () => {
  await chrome.storage.local.remove(["selectedName", "selectedPrice", "selectedPriceRaw"]);

  state.rawName  = null;
  state.price    = null;
  state.priceVND = null;

  nameDisplay.textContent  = "Not selected";
  nameDisplay.classList.add("empty");
  priceDisplay.textContent = "Not selected";
  priceDisplay.classList.add("empty");
  nameRow.classList.remove("done","active");
  priceRow.classList.remove("done","active");
  comparisonSection.classList.add("hidden");

  setStatus("idle", "Ready");
  scanSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  updateCompareBtn();
});

function showResult() {
  scanSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
}

// ── Background messages ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "NAME_SELECTED") {
    state.rawName = msg.rawName;
    nameDisplay.textContent = msg.rawName;
    nameDisplay.classList.remove("empty");
    nameRow.classList.add("done");
    setPickerUI(null);
    updateCompareBtn();
  }

  if (msg.type === "PRICE_SELECTED") {
    state.price    = msg.price;
    state.priceRaw = msg.rawText;

    // Convert to VND if needed
    if (state.currency === "VND") {
      state.priceVND  = msg.price;
      state.rateToVND = 1;
    } else {
      setStatus("loading", "Fetching rate…");
      const rate = await fetchRateToVND(state.currency);
      setStatus("idle", "Ready");
      if (rate) {
        state.rateToVND = rate;
        state.priceVND  = Math.round(msg.price * rate);
        showRateBadge(state.currency, rate);
      } else {
        state.priceVND = null;
      }
    }

    await chrome.storage.local.set({
      selectedPrice:    msg.price,
      selectedPriceRaw: msg.rawText,
    });

    priceRow.classList.add("done");
    setPickerUI(null);
    setPriceDisplay();
    updateCompareBtn();
  }

  if (msg.type === "PRICE_PARSE_ERROR") {
    setPickerUI(null);
    setStatus("error", "Parse Error");
    priceDisplay.textContent = `Cannot parse: "${msg.rawText}"`;
    priceDisplay.classList.add("empty");
  }

  if (msg.type === "PICKER_CANCELLED") {
    setPickerUI(null);
  }
});
