/**
 * pages/api/chat.js
 *
 * Proxy route: Next.js → FastAPI Chatbot Service (port 8000)
 * Không chứa logic AI, chỉ forward request.
 */

const CHATBOT_URL = process.env.CHATBOT_SERVICE_URL || "http://localhost:8000";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await fetch(`${CHATBOT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), history }),
      // Timeout 30s (Internet fallback có thể chậm hơn)
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chat proxy] Chatbot service error:", response.status, errorText);
      return res.status(502).json({ error: "Chatbot service unavailable" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error("[chat proxy] Request timeout");
      return res.status(504).json({ error: "Request timeout. Please try again." });
    }
    console.error("[chat proxy] Error:", err.message);
    return res.status(503).json({
      error: "Chatbot service is not running. Please start the Python service.",
    });
  }
}
