"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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

function SendButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0 tb-btn-primary"
      title="Send"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="var(--color-accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error ?? data.detail ?? res.statusText}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "No response." }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not reach the server. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const started = messages.length > 0;

  if (!started) {
    return (
      <div className="flex flex-col items-center pt-10 pb-6">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-4">
          <path d="M16 4c-1 4-4 7-8 8 4 1 7 4 8 8 1-4 4-7 8-8-4-1-7-4-8-8z" fill="var(--color-accent)" />
        </svg>
        <h2 className="text-2xl tb-h1 mb-6">Where do we start?</h2>
        <div className="w-full flex items-center gap-2 rounded-full px-2 py-2 pl-5" style={{ backgroundColor: "var(--color-panel)", border: "1px solid var(--color-border)" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Describe what you want to do…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
            style={{ color: "var(--color-text-primary)" }}
          />
          <SendButton disabled={loading || !input.trim()} onClick={send} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden tb-card"
      style={{ height: "420px" }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const toolPath = !isUser ? extractToolLink(msg.content) : null;
          const toolName = toolPath ? TOOL_PATHS[toolPath] : null;

          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
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
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 w-fit transition-colors tb-btn-primary"
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
            <div
              className="rounded-2xl px-4 py-2.5 text-sm"
              style={{ backgroundColor: "var(--color-elevated)", color: "var(--color-text-secondary)", borderBottomLeftRadius: "4px" }}
            >
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex items-center gap-2 rounded-full mx-3 mb-3" style={{ backgroundColor: "var(--color-panel)", border: "1px solid var(--color-border)" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe what you want to do…"
          className="flex-1 min-w-0 bg-transparent px-2 text-sm outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
        <SendButton disabled={loading || !input.trim()} onClick={send} />
      </div>
    </div>
  );
}
