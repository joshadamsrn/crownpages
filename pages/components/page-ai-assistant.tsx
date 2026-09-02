"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

const ASSISTANT_BLUE = "#0f4fb3";

export function PageAIAssistant({
  pageId,
  businessName,
  welcomeMessage,
}: {
  pageId: string;
  businessName: string;
  welcomeMessage: string;
  // Retained for compatibility with existing page renderers. The assistant
  // intentionally uses CrownPages blue so a light facility theme cannot make
  // its white labels and icons disappear.
  primaryColor?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, sending]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || sending) return;
    const previous = messages.filter((message) => message !== messages[0]).slice(-6);
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: nextQuestion }]);
    setSending(true);
    try {
      const response = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, question: nextQuestion, history: previous }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to answer right now.");
      setMessages((current) => [...current, { role: "assistant", content: payload.answer, sources: payload.sources }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "The assistant is temporarily unavailable. Please contact the facility directly.",
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[999990] font-sans sm:right-6">
      {open ? (
        <section
          aria-label={`${businessName} information assistant`}
          className="mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: ASSISTANT_BLUE }}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20"><Bot className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Ask {businessName}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Close assistant">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${message.role === "user" ? "text-white" : "border border-slate-200 bg-white text-slate-800"}`} style={message.role === "user" ? { backgroundColor: ASSISTANT_BLUE } : undefined}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources?.length ? <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">Knowledge sources: {message.sources.join(", ")}</p> : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><Sparkles className="h-4 w-4 animate-pulse" /> Looking that up…</div></div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={700}
                placeholder="Ask a question…"
                autoComplete="off"
                className="min-h-10 flex-1 bg-transparent px-2 text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button type="submit" disabled={!question.trim() || sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:cursor-not-allowed disabled:opacity-40" style={{ backgroundColor: ASSISTANT_BLUE }} aria-label="Send question">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] leading-4 text-slate-500">AI can make mistakes. Please don&apos;t share private health information.</p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto flex min-h-14 items-center gap-2 rounded-full px-5 py-3 font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
        style={{ backgroundColor: ASSISTANT_BLUE }}
        aria-label={`Ask ${businessName} a question`}
      >
        <MessageCircle className="h-5 w-5" />
        <span>Questions?</span>
      </button>
    </div>
  );
}
