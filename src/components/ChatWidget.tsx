import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Plus, Send, X } from "lucide-react";
import ironBot from "@/assets/iron-bot.png";

const TELEGRAM_URL = "https://t.me/Yuricccc";

type ChatMessage = { role: "user" | "bot"; text: string };
type Thread = { id: number; title: string; messages: ChatMessage[] };

const faqs: { q: string; a: string }[] = [
  {
    q: "How do I top up my game?",
    a: "Pick your game on the home page, enter your Player ID, tap Check ID, choose a package and a payment method, then press Buy Now. Your top-up is delivered to your game account.",
  },
  {
    q: "How long does delivery take?",
    a: "Top-ups are usually delivered within 1-3 minutes after payment is confirmed. If it takes longer, contact us on Telegram and we will check your order right away.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept ABA KHQR, Wing, ACLEDA and Bakong. Choose your preferred method on the game page before confirming your order.",
  },
  {
    q: "Where do I find my Player ID?",
    a: "Open your game and go to your profile page — your Player ID (and Zone ID for some games) is shown there. Copy it exactly into the ID field on our game page.",
  },
  {
    q: "I entered the wrong ID. What now?",
    a: "Contact us on Telegram @Yuricccc as soon as possible with your payment receipt and the correct ID, and we will help you sort it out.",
  },
  {
    q: "How can I contact the shop directly?",
    a: "Tap the Telegram button below to chat with our team directly. We are happy to help with orders, prices and any questions.",
  },
];

let nextThreadId = 1;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const active = threads.find((t) => t.id === activeId) ?? null;

  function openFaq(faq: (typeof faqs)[number]) {
    const existing = threads.find((t) => t.title === faq.q);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const thread: Thread = {
      id: nextThreadId++,
      title: faq.q,
      messages: [
        { role: "user", text: faq.q },
        { role: "bot", text: faq.a },
      ],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveId(thread.id);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    const reply =
      "Thanks for your message! For the fastest help, please tap the Telegram button to chat with our team directly at @Yuricccc.";
    if (active) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? { ...t, messages: [...t.messages, { role: "user", text }, { role: "bot", text: reply }] }
            : t,
        ),
      );
    } else {
      const thread: Thread = {
        id: nextThreadId++,
        title: text.length > 40 ? text.slice(0, 40) + "…" : text,
        messages: [
          { role: "user", text },
          { role: "bot", text: reply },
        ],
      };
      setThreads((prev) => [thread, ...prev]);
      setActiveId(thread.id);
    }
    setDraft("");
  }

  return (
    <>
      {/* floating launcher */}
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-brand-100 bg-card shadow-[0_10px_26px_oklch(0.25_0.09_264/0.4)] transition-transform hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6 text-brand-700" />
        ) : (
          <img src={ironBot} alt="Yuric Bot" className="h-full w-full object-cover" loading="lazy" width={816} height={816} />
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-card text-card-foreground shadow-[0_24px_60px_oklch(0.25_0.09_264/0.45)] sm:right-5">
          {/* header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-100/70 bg-card">
              <img src={ironBot} alt="" className="h-full w-full object-cover" loading="lazy" width={816} height={816} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-primary-foreground">Yuric Bot</p>
              <p className="text-xs text-brand-100">Online · replies fast</p>
            </div>
            {active && (
              <button
                type="button"
                aria-label="Back to topics"
                onClick={() => setActiveId(null)}
                className="rounded-lg p-1.5 text-primary-foreground/90 transition-colors hover:bg-white/15"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-primary-foreground/90 transition-colors hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {active ? (
            <>
              {/* conversation view */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/40 px-4 py-4">
                {active.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "bot" && (
                      <img
                        src={ironBot}
                        alt=""
                        className="mr-2 mt-1 h-7 w-7 shrink-0 rounded-full border border-brand-100 bg-card object-cover"
                        loading="lazy"
                        width={816}
                        height={816}
                      />
                    )}
                    <p
                      className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm border border-brand-100 bg-card text-card-foreground shadow-sm"
                      }`}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* composer */}
              <div className="border-t border-brand-100 bg-card p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message…"
                    className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400"
                  />
                  <button
                    type="button"
                    aria-label="Send message"
                    onClick={sendMessage}
                    className="btn-3d flex h-10 w-10 items-center justify-center rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* home: greeting + threads + FAQ */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-100/70 to-card p-4">
                  <p className="font-display text-base font-bold text-brand-700">Hi there! 👋</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    How can we help? Pick a question below or chat with us on Telegram.
                  </p>
                </div>

                {threads.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your chats</p>
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> New
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {threads.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(t.id)}
                            className="flex w-full items-center gap-2 rounded-xl border border-brand-100 bg-card px-3 py-2 text-left text-sm text-card-foreground transition-colors hover:border-brand-400"
                          >
                            <MessageCircle className="h-4 w-4 shrink-0 text-brand-500" />
                            <span className="flex-1 truncate">{t.title}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Frequently asked
                </p>
                <ul className="space-y-1.5">
                  {faqs.map((f) => (
                    <li key={f.q}>
                      <button
                        type="button"
                        onClick={() => openFaq(f)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-brand-100 bg-card px-3.5 py-2.5 text-left text-sm font-medium text-card-foreground transition-colors hover:border-brand-400 hover:bg-brand-100/40"
                      >
                        <span className="flex-1">{f.q}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* telegram CTA */}
              <div className="border-t border-brand-100 bg-card p-3">
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-3d flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold"
                >
                  <Send className="h-4 w-4" />
                  Chat on Telegram · @Yuricccc
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
