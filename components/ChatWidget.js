"use client";

/**
 * ChatWidget.js — AI Chatbot Widget cho PriceHawk
 *
 * Floating button góc phải màn hình, popup chat.
 * Nhúng vào app/layout.js để xuất hiện trên mọi trang.
 */

import { useState, useRef, useEffect } from "react";

// ── Inline styles (tránh conflict với CSS hiện tại) ──────────────────────────
const styles = {
  // Floating button
  fab: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    fontSize: "24px",
  },
  // Popup window
  popup: {
    position: "fixed",
    bottom: "92px",
    right: "24px",
    width: "380px",
    height: "560px",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9998,
    border: "1px solid rgba(0,0,0,0.08)",
    animation: "slideUp 0.25s ease",
  },
  // Header
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  headerAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "15px",
    margin: 0,
    lineHeight: 1.2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "12px",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    fontSize: "20px",
    padding: "4px",
    lineHeight: 1,
  },
  // Messages area
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "#f8f9fc",
  },
  // Message bubbles
  msgRow: (isUser) => ({
    display: "flex",
    justifyContent: isUser ? "flex-end" : "flex-start",
    alignItems: "flex-end",
    gap: "8px",
  }),
  bubble: (isUser) => ({
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    background: isUser
      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      : "#ffffff",
    color: isUser ? "#ffffff" : "#1a1a2e",
    fontSize: "14px",
    lineHeight: "1.5",
    boxShadow: isUser ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: isUser ? "none" : "1px solid rgba(0,0,0,0.06)",
  }),
  botAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    flexShrink: 0,
  },
  // Source badge
  sourceBadge: (source) => ({
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    marginTop: "4px",
    display: "inline-block",
    background:
      source === "database"
        ? "#e8f5e9"
        : source === "internet"
        ? "#fff3e0"
        : "#f3e5f5",
    color:
      source === "database"
        ? "#2e7d32"
        : source === "internet"
        ? "#e65100"
        : "#7b1fa2",
  }),
  sourceLabel: {
    database: "📦 Dữ liệu hệ thống",
    internet: "🌐 Tìm trên Internet",
    system: "🤖 PriceHawk Bot",
    not_found: "❌ Không tìm thấy",
  },
  // Typing indicator
  typing: {
    display: "flex",
    gap: "4px",
    padding: "12px 14px",
    background: "#ffffff",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)",
    width: "fit-content",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#667eea",
    animation: "bounce 1.2s infinite",
  },
  // Input area
  inputArea: {
    padding: "12px 16px",
    background: "#ffffff",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "1px solid rgba(102, 126, 234, 0.3)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    resize: "none",
    maxHeight: "100px",
    minHeight: "40px",
    fontFamily: "inherit",
    lineHeight: "1.4",
    background: "#f8f9fc",
    color: "#1a1a2e",
    transition: "border-color 0.2s",
  },
  sendBtn: (disabled) => ({
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "none",
    background: disabled
      ? "#e0e0e0"
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s ease",
    fontSize: "16px",
  }),
};

// ── Animate CSS (injected once) ───────────────────────────────────────────────
const cssAnimation = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30%           { transform: translateY(-6px); }
  }
  .chat-dot-1 { animation-delay: 0s; }
  .chat-dot-2 { animation-delay: 0.2s; }
  .chat-dot-3 { animation-delay: 0.4s; }
`;

// ── Initial welcome message ───────────────────────────────────────────────────
const WELCOME_MSG = {
  id: 0,
  role: "assistant",
  content:
    "Xin chào! Tôi là **PriceHawk Assistant** 🦅\n\nTôi có thể giúp bạn:\n• Tìm giá điện thoại, laptop, tablet\n• So sánh giá từ nhiều cửa hàng\n• Tra cứu thông số kỹ thuật\n\nBạn muốn tìm sản phẩm nào?",
  source: "system",
};


export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Inject CSS animation once
  useEffect(() => {
    const existing = document.getElementById("pricehawk-chat-css");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "pricehawk-chat-css";
      style.textContent = cssAnimation;
      document.head.appendChild(style);
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg = { id: Date.now(), role: "user", content: text, source: null };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    // Build history (exclude welcome msg, exclude current msg)
    const history = messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: res.ok
          ? data.reply
          : data.error || "Có lỗi xảy ra, vui lòng thử lại.",
        source: res.ok ? data.source : "system",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Không thể kết nối tới chatbot. Vui lòng kiểm tra lại.",
          source: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render message content (basic markdown: **bold** and [text](url))
  const renderContent = (content) => {
    const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    const parts = content.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          return (
            <a
              key={i}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#667eea", textDecoration: "underline", fontWeight: "bold" }}
            >
              {match[1]}
            </a>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="pricehawk-chat-fab"
        style={styles.fab}
        onClick={() => setIsOpen((o) => !o)}
        title="Chat với PriceHawk AI"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(102,126,234,0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(102,126,234,0.5)";
        }}
      >
        {isOpen ? "✕" : "🦅"}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div style={styles.popup}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerAvatar}>🦅</div>
            <div style={styles.headerText}>
              <p style={styles.headerTitle}>PriceHawk AI</p>
              <p style={styles.headerSub}>So sánh giá thông minh</p>
            </div>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} style={styles.msgRow(isUser)}>
                  {!isUser && <div style={styles.botAvatar}>🦅</div>}
                  <div>
                    <div style={styles.bubble(isUser)}>
                      {renderContent(msg.content)}
                    </div>
                    {!isUser && msg.source && msg.source !== "system" && (
                      <div style={styles.sourceBadge(msg.source)}>
                        {styles.sourceLabel[msg.source] || msg.source}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div style={styles.msgRow(false)}>
                <div style={styles.botAvatar}>🦅</div>
                <div style={styles.typing}>
                  <div style={styles.dot} className="chat-dot-1" />
                  <div style={styles.dot} className="chat-dot-2" />
                  <div style={styles.dot} className="chat-dot-3" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              id="pricehawk-chat-input"
              style={styles.input}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về giá, thông số sản phẩm..."
              disabled={isLoading}
              rows={1}
            />
            <button
              id="pricehawk-chat-send"
              style={styles.sendBtn(!inputText.trim() || isLoading)}
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
