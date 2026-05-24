/**
 * content/content.js
 * Handles: element picker mode, hover highlight, click capture, text/price extraction
 */

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────────
  let pickerMode = null; // 'name' | 'price' | null
  let lastHighlighted = null;
  let tooltip = null;

  // ── Tooltip ────────────────────────────────────────────────────────────────
  function createTooltip() {
    if (tooltip) return;
    tooltip = document.createElement("div");
    tooltip.id = "__ph_tooltip__";
    document.documentElement.appendChild(tooltip);
  }

  function removeTooltip() {
    if (tooltip) { tooltip.remove(); tooltip = null; }
  }

  function updateTooltip(el, x, y) {
    if (!tooltip) return;
    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const text = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60);
    tooltip.innerHTML = `<span class="ph-tag">&lt;${tag}${cls}&gt;</span> ${text}`;

    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let tx = x + 14;
    let ty = y + 14;
    if (tx + tw > window.innerWidth - 8) tx = x - tw - 14;
    if (ty + th > window.innerHeight - 8) ty = y - th - 14;
    tooltip.style.left = tx + "px";
    tooltip.style.top = ty + "px";
  }

  // ── Highlight ──────────────────────────────────────────────────────────────
  function highlight(el) {
    unhighlight();
    if (!el || el === document.documentElement || el === document.body) return;
    el.classList.add("__ph_hover__");
    lastHighlighted = el;
  }

  function unhighlight() {
    if (lastHighlighted) {
      lastHighlighted.classList.remove("__ph_hover__");
      lastHighlighted = null;
    }
  }

  // ── Text extraction ────────────────────────────────────────────────────────
  function extractText(el) {
    return (el.innerText || el.textContent || "")
      .trim()
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ");
  }

  function parsePrice(text) {
    // Remove currency symbols and letters, keep digits and separators
    const cleaned = text.replace(/[^\d.,]/g, "");
    if (!cleaned) return null;

    // Vietnamese: 25.990.000 or 25,990,000
    // Try: if more than one separator of same type → it's thousands separator
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;

    let normalized;
    if (dotCount > 1) {
      // dots are thousands separators: 25.990.000
      normalized = cleaned.replace(/\./g, "");
    } else if (commaCount > 1) {
      // commas are thousands separators: 25,990,000
      normalized = cleaned.replace(/,/g, "");
    } else if (dotCount === 1 && commaCount === 0) {
      // could be decimal: 25990.00 OR thousands: 25.990
      const afterDot = cleaned.split(".")[1];
      normalized = afterDot && afterDot.length === 3
        ? cleaned.replace(".", "") // thousands
        : cleaned.replace(".", "."); // decimal — keep
    } else if (commaCount === 1 && dotCount === 0) {
      const afterComma = cleaned.split(",")[1];
      normalized = afterComma && afterComma.length === 3
        ? cleaned.replace(",", "") // thousands
        : cleaned.replace(",", "."); // decimal
    } else {
      normalized = cleaned;
    }

    const num = parseFloat(normalized);
    return isNaN(num) ? null : Math.round(num);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    highlight(el);
    updateTooltip(el, e.clientX + window.scrollX, e.clientY + window.scrollY);
    if (tooltip) {
      tooltip.style.left = (e.clientX + 14) + "px";
      tooltip.style.top  = (e.clientY + 14) + "px";
    }
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = lastHighlighted || e.target;
    const rawText = extractText(el);

    if (pickerMode === "name") {
      stopPicker();
      chrome.runtime.sendMessage({
        type: "NAME_SELECTED",
        rawName: rawText,
      });
    } else if (pickerMode === "price") {
      const price = parsePrice(rawText);
      stopPicker();
      if (price === null) {
        chrome.runtime.sendMessage({
          type: "PRICE_PARSE_ERROR",
          rawText,
        });
      } else {
        chrome.runtime.sendMessage({
          type: "PRICE_SELECTED",
          price,
          rawText,
        });
      }
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      stopPicker();
      chrome.runtime.sendMessage({ type: "PICKER_CANCELLED" });
    }
  }

  // ── Picker lifecycle ───────────────────────────────────────────────────────
  function startPicker(mode) {
    pickerMode = mode;
    document.documentElement.classList.add("__ph_picker__");
    createTooltip();
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function stopPicker() {
    pickerMode = null;
    document.documentElement.classList.remove("__ph_picker__");
    unhighlight();
    removeTooltip();
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "START_PICKER") {
      startPicker(msg.mode); // mode: 'name' | 'price'
    } else if (msg.type === "STOP_PICKER") {
      stopPicker();
    }
  });
})();