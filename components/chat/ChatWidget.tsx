"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Track my order",
  "What sizes are available?",
  "How long does shipping take?",
  "What's your return policy?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(false);
    }
  }, [open, messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hey! I'm Sashico's assistant. Ask me about products, sizing, shipping, returns, or share your order number to track it.",
      }]);
    }
  }, [open]);

  function getPageContext() {
    const url = typeof window !== "undefined" ? window.location.href : pathname;
    const title = typeof document !== "undefined" ? document.title : "";
    return `Page: ${url}\nTitle: ${title}`;
  }

  function cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
      .replace(/\*(.*?)\*/g, "$1")        // *italic*
      .replace(/__(.*?)__/g, "$1")        // __bold__
      .replace(/`(.*?)`/g, "$1")          // `code`
      .replace(/#{1,6}\s/g, "")           // # headings
      .replace(/^\s*[\*\-]\s/gm, "- ");   // normalise bullet points
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          pageContext: getPageContext(),
        }),
      });
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: cleanMarkdown(reply || "Sorry, something went wrong.") }]);
      if (!open) setUnread(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Email hello@sashico.com for help." }]);
    } finally {
      setLoading(false);
    }
  }

  // Position chat above mobile bottom nav on small screens
  const chatBottom = "bottom-[4.5rem] sm:bottom-6";
  const btnBottom = "bottom-[4.5rem] sm:bottom-6";

  return (
    <>
      {/* Chat panel */}
      <div className={cn(
        `fixed ${chatBottom} right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[380px] bg-white border border-brand-gray-200 shadow-xl flex flex-col origin-bottom-right`,
        open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      )}
        style={{ height: "min(480px, calc(100vh - 8rem))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-brand-black text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-sans font-semibold">Sashico Support</p>
              <p className="text-[10px] text-white/50 font-sans">Usually replies instantly</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/60 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] px-3.5 py-2.5 text-sm font-sans leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-brand-black text-white"
                  : "bg-brand-gray-50 text-brand-black border border-brand-gray-100"
              )}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-brand-gray-50 border border-brand-gray-100 px-4 py-3 flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-1.5 bg-brand-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Suggested prompts before first user message */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs font-sans border border-brand-gray-200 px-3 py-1.5 text-brand-gray-600 hover:border-brand-black hover:text-brand-black transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-brand-gray-100 px-4 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2 items-center"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or share order #..."
              disabled={loading}
              className="flex-1 text-sm font-sans bg-brand-gray-50 border border-brand-gray-200 px-3 py-2.5 focus:border-brand-black focus:outline-none placeholder:text-brand-gray-300 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="bg-brand-black text-white p-2.5 hover:bg-brand-gray-800 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Floating button — hidden on mobile when chat is open (header has X already) */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          `fixed ${btnBottom} right-3 sm:right-6 z-50 h-12 w-12 sm:h-14 sm:w-14 bg-brand-black text-white items-center justify-center shadow-lg`,
          open ? "hidden sm:flex" : "flex"
        )}
        aria-label="Chat support"
      >
        {open ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
        {unread && !open && (
          <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
