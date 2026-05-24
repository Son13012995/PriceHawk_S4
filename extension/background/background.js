/**
 * background/background.js
 * Service worker: relays messages between popup ↔ content script, calls API
 */

const API_BASE = "http://160.187.229.3:3000/api/extension"; // Change to your deployed URL

// ── Open side panel on toolbar icon click ──────────────────────────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// ── Active tab helper ──────────────────────────────────────────────────────
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ── Send to content script ─────────────────────────────────────────────────
async function sendToContent(tabId, msg) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch (err) {
    console.warn("[PH] Content script not ready:", err.message);
  }
}

// ── API calls ──────────────────────────────────────────────────────────────
async function compareProduct(payload) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function saveProduct(payload) {
  const res = await fetch(`${API_BASE}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Message handler ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const tab = await getActiveTab();

    switch (msg.type) {
      // Popup → background → content: start picker
      case "START_PICKER": {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/content.js"],
        }).catch(() => {});
        await sendToContent(tab.id, { type: "START_PICKER", mode: msg.mode });
        sendResponse({ ok: true });
        break;
      }

      // Popup → background → content: cancel picker
      case "STOP_PICKER": {
        await sendToContent(tab.id, { type: "STOP_PICKER" });
        sendResponse({ ok: true });
        break;
      }

      // Content → background → popup: name captured
      case "NAME_SELECTED": {
        await chrome.storage.local.set({ selectedName: msg.rawName });
        // Forward to popup
        chrome.runtime.sendMessage({ type: "NAME_SELECTED", rawName: msg.rawName }).catch(() => {});
        sendResponse({ ok: true });
        break;
      }

      // Content → background → popup: price captured
      case "PRICE_SELECTED": {
        await chrome.storage.local.set({ selectedPrice: msg.price, selectedPriceRaw: msg.rawText });
        chrome.runtime.sendMessage({ type: "PRICE_SELECTED", price: msg.price, rawText: msg.rawText }).catch(() => {});
        sendResponse({ ok: true });
        break;
      }

      // Content → background → popup: price parse error
      case "PRICE_PARSE_ERROR": {
        chrome.runtime.sendMessage({ type: "PRICE_PARSE_ERROR", rawText: msg.rawText }).catch(() => {});
        sendResponse({ ok: true });
        break;
      }

      // Content → background → popup: picker cancelled (Escape)
      case "PICKER_CANCELLED": {
        chrome.runtime.sendMessage({ type: "PICKER_CANCELLED" }).catch(() => {});
        sendResponse({ ok: true });
        break;
      }

      // Popup → background: run compare API
      case "COMPARE": {
        try {
          const data = await compareProduct({
            name: msg.name,
            price: msg.price,
            sourceUrl: msg.sourceUrl,
            brand: msg.brand || null,
            category: msg.category || null,
          });
          sendResponse({ ok: true, data });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        break;
      }

      // Popup → background: run save API
      case "SAVE": {
        try {
          const data = await saveProduct({
            name: msg.name,
            price: msg.price,
            sourceUrl: msg.sourceUrl,
            brand: msg.brand || null,
            category: msg.category || null,
          });
          sendResponse({ ok: true, data });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
        break;
      }

      default:
        sendResponse({ ok: false, error: "Unknown message type" });
    }
  })();

  return true; // keep channel open for async sendResponse
});