/**
 * popup/popup.js — PriceHawk Scanner (compare-only, no save)
 */

// ── DOM refs ────────────────────────────────────────────────────────────────
const statusBadge    = document.getElementById("status-badge");
const statusText     = document.getElementById("status-text");
const nameDisplay    = document.getElementById("name-display");
const priceDisplay   = document.getElementById("price-display");
const nameRow        = document.getElementById("name-row");
const priceRow       = document.getElementById("price-row");
const btnPickName    = document.getElementById("btn-pick-name");
const btnPickPrice   = document.getElementById("btn-pick-price");
const btnCompare     = document.getElementById("btn-compare");
const compareLabel   = document.getElementById("compare-label");
const compareSpinner = document.getElementById("compare-spinner");
const pickerHint     = document.getElementById("picker-hint");
const hintText       = document.getElementById("hint-text");
const btnCancelPick  = document.getElementById("btn-cancel-pick");
const scanSection    = document.getElementById("scan-section");
const resultSection  = document.getElementById("result-section");
const verdictBanner  = document.getElementById("verdict-banner");
const verdictIcon    = document.getElementById("verdict-icon");
const verdictTitle   = document.getElementById("verdict-title");
const verdictSub     = document.getElementById("verdict-sub");
const statsGrid      = document.getElementById("stats-grid");
const detailSection  = document.getElementById("detail-section");
const btnReset       = document.getElementById("btn-reset");
const categorySelect = document.getElementById("category-select");

// ── State ───────────────────────────────────────────────────────────────────
let state = {
  rawName: null,
  price: null,
  priceRaw: null,
  picking: null,
  sourceUrl: null,
  category: "dien-thoai",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(mode, label) {
  statusBadge.className = `status-badge ${mode}`;
  statusText.textContent = label;
}

function formatPrice(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n) + " ₫";
}

function formatDiff(diff) {
  if (diff == null) return "—";
  const sign = diff > 0 ? "+" : "";
  return sign + new Intl.NumberFormat("en-US").format(diff) + " ₫";
}

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => resolve(resp || {}));
  });
}

function updateCompareBtn() {
  btnCompare.disabled = !(state.rawName && state.price !== null);
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

function renderResult(data) {
  // Verdict
  if (data.found) {
    const diff = data.priceDiff;
    const diffClass = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const diffLabel = diff > 0 ? "More expensive" : diff < 0 ? "Cheaper" : "Same price";

    verdictBanner.className = "verdict-banner match";
    verdictIcon.className   = "verdict-icon match";
    verdictIcon.textContent = "✓";
    verdictTitle.className  = "verdict-title match";
    verdictTitle.textContent= "Matched";
    verdictSub.textContent  = `Found in PriceHawk database`;

    // Stats
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">DB Price</div>
        <div class="stat-value big">${formatPrice(data.matchedProduct.price)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current Price</div>
        <div class="stat-value big">${formatPrice(data.currentPrice)}</div>
      </div>
      <div class="stat-card" style="grid-column:1/-1">
        <div class="stat-label">Difference</div>
        <div class="stat-value ${diffClass}">${formatDiff(diff)}</div>
        <div class="diff-pill ${diffClass}">${diff > 0 ? "↑" : diff < 0 ? "↓" : "="} ${diffLabel}</div>
      </div>
    `;

    // Details
    detailSection.innerHTML = `
      <div class="detail-row">
        <span class="detail-key">DB Product</span>
        <span class="detail-val">${escapeHtml(data.matchedProduct.name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Identity Key</span>
        <span class="detail-val" style="font-family:var(--mono);font-size:10px">${escapeHtml(data.identityKey)}</span>
      </div>
    `;
  } else {
    // Not found
    const conf = ((data.normalizedResult?.confidenceScore || 0) * 100).toFixed(0);

    verdictBanner.className = "verdict-banner nomatch";
    verdictIcon.className   = "verdict-icon nomatch";
    verdictIcon.textContent = "?";
    verdictTitle.className  = "verdict-title nomatch";
    verdictTitle.textContent= "Not Found";
    verdictSub.textContent  = `No match in database`;

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
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(["selectedName", "selectedPrice", "selectedPriceRaw", "selectedCategory"]);

  if (stored.selectedName) {
    state.rawName = stored.selectedName;
    nameDisplay.textContent = stored.selectedName;
    nameDisplay.classList.remove("empty");
    nameRow.classList.add("done");
  }
  if (stored.selectedPrice != null) {
    state.price    = stored.selectedPrice;
    state.priceRaw = stored.selectedPriceRaw || null;
    priceDisplay.textContent = formatPrice(stored.selectedPrice);
    priceDisplay.classList.remove("empty");
    priceRow.classList.add("done");
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

// ── Events ───────────────────────────────────────────────────────────────────
categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  chrome.storage.local.set({ selectedCategory: state.category });
});

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

btnCompare.addEventListener("click", async () => {
  if (!state.rawName || state.price === null) return;

  setStatus("loading", "Comparing…");
  compareLabel.textContent = "Comparing…";
  compareSpinner.classList.remove("hidden");
  btnCompare.disabled = true;

  const resp = await send({
    type: "COMPARE",
    name: state.rawName,
    price: state.price,
    sourceUrl: state.sourceUrl,
    category: state.category,
  });

  compareLabel.textContent = "Compare Price";
  compareSpinner.classList.add("hidden");

  if (!resp.ok) {
    setStatus("error", "Error");
    // Show error in result
    verdictBanner.className = "verdict-banner nomatch";
    verdictIcon.className   = "verdict-icon nomatch";
    verdictIcon.textContent = "!";
    verdictTitle.className  = "verdict-title nomatch";
    verdictTitle.textContent= "API Error";
    verdictSub.textContent  = resp.error || "Unknown error";
    statsGrid.innerHTML     = "";
    detailSection.innerHTML = "";
    showResult();
    return;
  }

  setStatus(resp.data.found ? "success" : "error", resp.data.found ? "Matched" : "Not Found");
  renderResult(resp.data);
  showResult();
});

btnReset.addEventListener("click", async () => {
  await chrome.storage.local.remove(["selectedName", "selectedPrice", "selectedPriceRaw"]);

  state.rawName = null;
  state.price   = null;

  nameDisplay.textContent = "Not selected";
  nameDisplay.classList.add("empty");
  priceDisplay.textContent = "Not selected";
  priceDisplay.classList.add("empty");
  nameRow.classList.remove("done","active");
  priceRow.classList.remove("done","active");

  setStatus("idle","Ready");
  scanSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  updateCompareBtn();
});

function showResult() {
  scanSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
}

// ── Background messages ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
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
    priceDisplay.textContent = formatPrice(msg.price);
    priceDisplay.classList.remove("empty");
    priceRow.classList.add("done");
    setPickerUI(null);
    updateCompareBtn();
  }
  if (msg.type === "PRICE_PARSE_ERROR") {
    setPickerUI(null);
    setStatus("error","Parse Error");
    priceDisplay.textContent = `Cannot parse: "${msg.rawText}"`;
    priceDisplay.classList.add("empty");
  }
  if (msg.type === "PICKER_CANCELLED") {
    setPickerUI(null);
  }
});