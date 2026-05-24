/**
 * popup/popup.js
 * Full state machine for PriceHawk Scanner popup.
 */

// ── DOM refs ────────────────────────────────────────────────────────────────
const statusDot      = document.getElementById("status-dot");
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
const resultBox      = document.getElementById("result-box");
const saveActions    = document.getElementById("save-actions");
const btnSave        = document.getElementById("btn-save");
const btnSkip        = document.getElementById("btn-skip");
const saveStatus     = document.getElementById("save-status");
const btnReset       = document.getElementById("btn-reset");
const categorySelect = document.getElementById("category-select");

// ── State ───────────────────────────────────────────────────────────────────
let state = {
  rawName: null,
  price: null,
  priceRaw: null,
  compareResult: null,
  picking: null, // 'name' | 'price' | null
  sourceUrl: null,
  category: "dien-thoai",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function setDot(mode) {
  statusDot.className = `dot ${mode}`;
}

function formatPrice(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

function formatDiff(diff) {
  if (diff == null) return "—";
  const sign = diff > 0 ? "+" : "";
  return sign + new Intl.NumberFormat("vi-VN").format(diff) + " ₫";
}

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      resolve(resp || {});
    });
  });
}

function updateCompareBtn() {
  btnCompare.disabled = !(state.rawName && state.price !== null);
}

function setPickerUI(mode) {
  state.picking = mode;
  if (mode) {
    pickerHint.classList.remove("hidden");
    hintText.textContent =
      mode === "name"
        ? "Click the element containing the product name"
        : "Click the element containing the price";
    setDot("picking");
    btnPickName.disabled  = true;
    btnPickPrice.disabled = true;
    btnCompare.disabled   = true;
    if (mode === "name")  nameRow.classList.add("active");
    if (mode === "price") priceRow.classList.add("active");
  } else {
    pickerHint.classList.add("hidden");
    setDot("idle");
    btnPickName.disabled  = false;
    btnPickPrice.disabled = false;
    nameRow.classList.remove("active");
    priceRow.classList.remove("active");
    updateCompareBtn();
  }
}

function renderResult(data) {
  resultBox.innerHTML = "";
  resultBox.className = data.found ? "result-match" : "result-nomatch";

  if (data.found) {
    const diff = data.priceDiff;
    const diffClass = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const diffLabel = diff > 0 ? "↑ Đắt hơn" : diff < 0 ? "↓ Rẻ hơn" : "= Bằng giá";

    resultBox.innerHTML = `
      <div class="result-title ok">✓ Matched</div>
      <div class="result-row">
        <span class="result-key">DB Product</span>
        <span class="result-val">${escapeHtml(data.matchedProduct.name)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">DB Price</span>
        <span class="result-val">${formatPrice(data.matchedProduct.price)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Current Price</span>
        <span class="result-val">${formatPrice(data.currentPrice)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Difference</span>
        <span class="result-val ${diffClass}">${formatDiff(diff)} ${diffLabel}</span>
      </div>
      <div class="result-identity">identity_key: ${escapeHtml(data.identityKey)}</div>
    `;
    saveActions.classList.remove("hidden");
  } else {
    resultBox.innerHTML = `
      <div class="result-title fail">✗ Not Found</div>
      <div class="result-row">
        <span class="result-key">Name scanned</span>
        <span class="result-val">${escapeHtml(state.rawName)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Identity key</span>
        <span class="result-val">${escapeHtml(data.identityKey || "—")}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Confidence</span>
        <span class="result-val">${((data.normalizedResult?.confidenceScore || 0) * 100).toFixed(0)}%</span>
      </div>
    `;
    saveActions.classList.remove("hidden");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showScanSection() {
  scanSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
}

function showResultSection() {
  scanSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
}

// ── Init: restore from storage ───────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(["selectedName", "selectedPrice", "selectedPriceRaw", "selectedCategory"]);

  if (stored.selectedName) {
    state.rawName = stored.selectedName;
    nameDisplay.textContent = stored.selectedName;
    nameDisplay.classList.remove("empty");
    nameRow.classList.add("done");
  }
  if (stored.selectedPrice != null) {
    state.price = stored.selectedPrice;
    state.priceRaw = stored.selectedPriceRaw || null;
    priceDisplay.textContent = formatPrice(stored.selectedPrice);
    priceDisplay.classList.remove("empty");
    priceRow.classList.add("done");
  }

  if (stored.selectedCategory) {
    state.category = stored.selectedCategory;
    categorySelect.value = stored.selectedCategory;
  }

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.sourceUrl = tab?.url || "";

  updateCompareBtn();
}

init();

// ── Event listeners ──────────────────────────────────────────────────────────

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  chrome.storage.local.set({ selectedCategory: state.category });
});

btnPickName.addEventListener("click", async () => {
  setPickerUI("name");
  await send({ type: "START_PICKER", mode: "name" });
//   window.close(); // close popup so user can interact with page
});

btnPickPrice.addEventListener("click", async () => {
  setPickerUI("price");
  await send({ type: "START_PICKER", mode: "price" });
//   window.close();
});

btnCancelPick.addEventListener("click", async () => {
  await send({ type: "STOP_PICKER" });
  setPickerUI(null);
});

btnCompare.addEventListener("click", async () => {
  if (!state.rawName || state.price === null) return;

  setDot("loading");
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

  compareLabel.textContent = "Compare";
  compareSpinner.classList.add("hidden");

  if (!resp.ok) {
    setDot("error");
    resultBox.innerHTML = `<div class="result-title fail">⚠ API Error</div><div class="result-row"><span class="result-key">Error</span><span class="result-val">${escapeHtml(resp.error)}</span></div>`;
    saveActions.classList.add("hidden");
    showResultSection();
    return;
  }

  state.compareResult = resp.data;
  setDot(resp.data.found ? "success" : "error");
  saveStatus.classList.add("hidden");
  saveStatus.className = "save-status hidden";
  renderResult(resp.data);
  showResultSection();
});

btnSave.addEventListener("click", async () => {
  btnSave.disabled = true;
  btnSave.textContent = "Saving…";

  const resp = await send({
    type: "SAVE",
    name: state.rawName,
    price: state.price,
    sourceUrl: state.sourceUrl,
    category: state.category,
  });

  btnSave.textContent = "Save to Database";
  btnSave.disabled = false;
  saveActions.classList.add("hidden");
  saveStatus.classList.remove("hidden");

  if (!resp.ok) {
    saveStatus.className = "save-status error";
    saveStatus.textContent = "⚠ Save failed: " + (resp.error || "Unknown error");
    return;
  }

  if (resp.data?.duplicate) {
    saveStatus.className = "save-status dup";
    saveStatus.textContent = "ℹ Product already exists in database.";
  } else if (resp.data?.success) {
    saveStatus.className = "save-status success";
    saveStatus.textContent = `✓ Saved! Product ID: ${resp.data.productId}`;
    setDot("success");
  }
});

btnSkip.addEventListener("click", () => {
  saveActions.classList.add("hidden");
  saveStatus.className = "save-status";
  saveStatus.classList.add("hidden");
});

btnReset.addEventListener("click", async () => {
  // Clear storage
  await chrome.storage.local.remove(["selectedName", "selectedPrice", "selectedPriceRaw", "selectedCategory"]);

  // Reset state
  state.rawName = null;
  state.price = null;
  state.compareResult = null;

  nameDisplay.textContent = "Not selected";
  nameDisplay.classList.add("empty");
  priceDisplay.textContent = "Not selected";
  priceDisplay.classList.add("empty");
  nameRow.classList.remove("done", "active");
  priceRow.classList.remove("done", "active");
  saveActions.classList.add("hidden");
  saveStatus.classList.add("hidden");

  setDot("idle");
  showScanSection();
  updateCompareBtn();
});

// ── Listen for messages from background (content script results) ─────────────
chrome.runtime.onMessage.addListener((msg) => {
  // These fire when popup is open and user has already picked
  // (edge case: popup re-opened after picking)
  if (msg.type === "NAME_SELECTED") {
    state.rawName = msg.rawName;
    nameDisplay.textContent = msg.rawName;
    nameDisplay.classList.remove("empty");
    nameRow.classList.add("done");
    setPickerUI(null);
    updateCompareBtn();
  }

  if (msg.type === "PRICE_SELECTED") {
    state.price = msg.price;
    state.priceRaw = msg.rawText;
    priceDisplay.textContent = formatPrice(msg.price);
    priceDisplay.classList.remove("empty");
    priceRow.classList.add("done");
    setPickerUI(null);
    updateCompareBtn();
  }

  if (msg.type === "PRICE_PARSE_ERROR") {
    setPickerUI(null);
    setDot("error");
    priceDisplay.textContent = `Cannot parse: "${msg.rawText}"`;
    priceDisplay.classList.add("empty");
  }

  if (msg.type === "PICKER_CANCELLED") {
    setPickerUI(null);
  }
});