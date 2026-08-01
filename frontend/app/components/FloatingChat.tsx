"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const _RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = _RAW_URL.startsWith("http") ? _RAW_URL : `https://${_RAW_URL}`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TOOL_PATHS: Record<string, string> = {
  "/tools/equal-area-slope": "Equal Area Slope",
  "/tools/ifd-climate-change": "IFD Climate Change Adjustment",
};

function extractToolLink(text: string): string | null {
  const match = text.match(/\/tools\/[\w-]+/);
  return match ? match[0] : null;
}

export default function FloatingChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Tell me what you want to do and I'll point you to the right tool." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // All hooks must come before any conditional return
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Don't show on home page — it already has the embedded chatbot
  if (pathname === "/") return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "340px",
            height: "460px",
            backgroundColor: "var(--color-panel)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: "var(--color-elevated)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Toolbox Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="text-lg leading-none transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const toolPath = !isUser ? extractToolLink(msg.content) : null;
              const toolName = toolPath ? TOOL_PATHS[toolPath] : null;
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                    style={{
                      backgroundColor: isUser ? "var(--color-accent)" : "var(--color-elevated)",
                      color: isUser ? "var(--color-accent-text)" : "var(--color-text-primary)",
                      borderBottomRightRadius: isUser ? "4px" : undefined,
                      borderBottomLeftRadius: !isUser ? "4px" : undefined,
                    }}
                  >
                    {msg.content}
                    {toolName && toolPath && (
                      <Link
                        href={toolPath}
                        onClick={() => setOpen(false)}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 w-fit tb-btn-primary"
                      >
                        Open {toolName} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-elevated)", color: "var(--color-text-secondary)" }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-2.5 flex gap-2 flex-shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask something…"
              className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none tb-input"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 flex-shrink-0 tb-btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--color-accent)" }}
        title="Open assistant"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4L14 14M14 4L4 14" stroke="var(--color-accent-text)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v9a1 1 0 01-1 1H6l-4 3V4z" fill="var(--color-accent-text)" />
          </svg>
        )}
      </button>
    </div>
  );
}
