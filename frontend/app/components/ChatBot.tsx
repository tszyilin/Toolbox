"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Tell me what you're working on today and I'll point you to the right tool.",
    },
  ]);
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

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden shadow-sm"
      style={{ border: "1px solid #8CB6D0", height: "420px", backgroundColor: "white" }}
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
                  backgroundColor: isUser ? "#1A72B5" : "#f0f4f7",
                  color: isUser ? "white" : "#1e2a35",
                  borderBottomRightRadius: isUser ? "4px" : undefined,
                  borderBottomLeftRadius: !isUser ? "4px" : undefined,
                }}
              >
                {msg.content}
                {toolName && toolPath && (
                  <Link
                    href={toolPath}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 w-fit transition-colors"
                    style={{ backgroundColor: "#1A72B5", color: "white" }}
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
              style={{ backgroundColor: "#f0f4f7", color: "#1A72B5", borderBottomLeftRadius: "4px" }}
            >
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2" style={{ borderTop: "1px solid #8CB6D0" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe what you want to do…"
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ border: "1px solid #8CB6D0", color: "#1e2a35" }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-colors flex-shrink-0"
          style={{ backgroundColor: "#1A72B5" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#145D96")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1A72B5")}
        >
          Send
        </button>
      </div>
    </div>
  );
}
