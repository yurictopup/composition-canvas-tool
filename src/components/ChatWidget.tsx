// Yuric Bot in Khmer — adapted from src/components/ChatWidget.tsx (yurictopup/composition-canvas-tool@031a95c):
// FAQ threads and Telegram hand-off as before; typed questions are answered by topic and game (chatBrain.ts).
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  Gamepad2,
  Headphones,
  IdCard,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import { BotLogo } from "./BotLogo";
import { answer, DEFAULT_SUGGESTIONS, type BotAction } from "@/lib/chatBrain";

type Icon = ComponentType<{ className?: string }>;
type ChatMessage = {
  role: "user" | "bot";
  text: string;
  actions?: BotAction[];
  suggestions?: string[];
};
type Thread = { id: number; title: string; messages: ChatMessage[] };
export type ChatFaq = { q: string; a: string; icon?: Icon; telegram?: boolean };

export const defaultFaqs: ChatFaq[] = [
  {
    q: "តើបញ្ចូលពេជ្រហ្គេមដោយរបៀបណា?",
    a: "ជ្រើសហ្គេមនៅទំព័រដើម បញ្ចូល Player ID រួចចុច Check ID។ បន្ទាប់មកជ្រើសកញ្ចប់ និងវិធីបង់ប្រាក់ ហើយចុច Buy Now។ ពេជ្រនឹងចូលទៅគណនីហ្គេមរបស់អ្នក។",
    icon: Gamepad2,
  },
  {
    q: "ការបញ្ចូលចំណាយពេលប៉ុន្មាន?",
    a: "ជាធម្មតាពេជ្រចូលក្នុងរយៈពេល 1-3 នាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់។ បើយូរជាងនេះ សូមទាក់ទងយើងតាម Telegram យើងនឹងពិនិត្យការបញ្ជាទិញរបស់អ្នកភ្លាមៗ។",
    icon: Clock,
  },
  {
    q: "តើអាចបង់ប្រាក់តាមវិធីណាខ្លះ?",
    a: "យើងទទួល ABA KHQR, Wing, ACLEDA និង Bakong។ សូមជ្រើសវិធីបង់ប្រាក់នៅទំព័រហ្គេម មុនពេលបញ្ជាក់ការបញ្ជាទិញ។",
    icon: CreditCard,
  },
  {
    q: "តើរក Player ID នៅឯណា?",
    a: "បើកហ្គេម ហើយចូលទៅទំព័រ Profile។ Player ID របស់អ្នក (និង Zone ID សម្រាប់ហ្គេមខ្លះ) បង្ហាញនៅទីនោះ។ សូមចម្លងវាឱ្យបានត្រឹមត្រូវ ទៅក្នុងប្រអប់ ID នៅទំព័រហ្គេម។",
    icon: IdCard,
  },
  {
    q: "ខ្ញុំបញ្ចូល ID ខុស តើត្រូវធ្វើដូចម្តេច?",
    a: "សូមទាក់ទងយើងតាម Telegram @Yuricccc ឱ្យបានឆាប់ ដោយភ្ជាប់វិក្កយបត្របង់ប្រាក់ និង ID ដែលត្រឹមត្រូវ។ យើងនឹងជួយដោះស្រាយជូន។",
    icon: CircleAlert,
    telegram: true,
  },
  {
    q: "តើទាក់ទងហាងដោយផ្ទាល់ដោយរបៀបណា?",
    a: "ចុចប៊ូតុង Telegram ខាងក្រោម ដើម្បីជជែកជាមួយក្រុមការងារយើងដោយផ្ទាល់។ យើងរីករាយជួយលើការបញ្ជាទិញ តម្លៃ និងសំណួរផ្សេងៗ។",
    icon: Headphones,
    telegram: true,
  },
];

export type ChatWidgetProps = {
  faqs?: ChatFaq[];
  telegram?: string;
  /** Link to a game's top-up page, used by the bot's "បញ្ចូល …" buttons. Default `/game/<id>`. */
  gameHref?: (id: string) => string;
  defaultOpen?: boolean;
};

let nextThreadId = 1;

export function ChatWidget({
  faqs = defaultFaqs,
  telegram = "Yuricccc",
  gameHref = (id) => `/game/${id}`,
  defaultOpen = false,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const telegramAction: BotAction = {
    label: `ជជែកតាម Telegram · @${telegram}`,
    href: `https://t.me/${telegram}`,
  };

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, typing, activeId]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function openFaq(faq: ChatFaq) {
    const existing = threads.find((t) => t.title === faq.q);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const bot: ChatMessage = {
      role: "bot",
      text: faq.a,
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
      ...(faq.telegram ? { actions: [telegramAction] } : {}),
    };
    const thread: Thread = {
      id: nextThreadId++,
      title: faq.q,
      messages: [{ role: "user", text: faq.q }, bot],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveId(thread.id);
  }

  function ask(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;
    let id = active?.id;
    if (id == null) {
      id = nextThreadId++;
      const thread: Thread = {
        id,
        title: text.length > 40 ? text.slice(0, 40) + "…" : text,
        messages: [{ role: "user", text }],
      };
      setThreads((prev) => [thread, ...prev]);
      setActiveId(id);
    } else {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, messages: [...t.messages, { role: "user", text }] } : t,
        ),
      );
    }
    setDraft("");
    setTyping(true);
    const reply = answer(text, gameHref);
    const threadId = id;
    timer.current = setTimeout(
      () => {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, { role: "bot", ...reply }] } : t,
          ),
        );
        setTyping(false);
      },
      650 + Math.min(900, reply.text.length * 4),
    );
  }

  const composer = (
    <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-input py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-brand-400">
      <input
        id="yt-chat-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ask(draft)}
        placeholder="សរសេរសំណួររបស់អ្នក…"
        aria-label="សរសេរសំណួររបស់អ្នក"
        className="h-10 min-w-0 flex-1 bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        aria-label="ផ្ញើសារ"
        onClick={() => ask(draft)}
        disabled={typing}
        className="btn-3d grid h-10 w-10 shrink-0 place-items-center rounded-xl disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );

  const botAvatar = (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_40%,var(--brand-700),var(--brand-950)_80%)] ring-1 ring-brand-100">
      <BotLogo size={24} animated={false} stars={false} title="" />
    </span>
  );

  const scroll = "[scrollbar-width:thin] [scrollbar-color:var(--color-brand-100)_transparent]";

  return (
    <>
      {/* launcher — no container circle; bot head floats freely */}
      <button
        type="button"
        data-chat-launcher=""
        aria-label={open ? "បិទការជជែក" : "បើកការជជែក"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 grid h-16 w-16 place-items-center transition-transform hover:scale-105 drop-shadow-[0_8px_22px_oklch(0.25_0.09_264/0.55)]"
      >
        {open ? (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_40%,var(--brand-700),var(--brand-950)_80%)] shadow-lg ring-2 ring-brand-100/60">
            <X className="h-5 w-5 text-white" />
          </span>
        ) : (
          <>
            <BotLogo size={60} stars animated title="Yuric Bot" />
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white/40 bg-brand-400 shadow-[0_0_8px_oklch(0.72_0.13_252/0.9)]" />
          </>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(560px,calc(100vh-7rem))] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-brand-100 bg-card font-sans text-card-foreground shadow-[0_24px_60px_oklch(0.25_0.09_264/0.45)] animate-in fade-in slide-in-from-bottom-4 duration-200 sm:right-5">
          {/* header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-brand-950 px-4 py-4">
            <span className="sparkle right-24 top-3" aria-hidden="true" />
            <span className="sparkle right-16 top-10 [animation-delay:1.2s]" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              {active && (
                <button
                  type="button"
                  aria-label="ត្រឡប់ក្រោយ"
                  onClick={() => setActiveId(null)}
                  className="-ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary-foreground transition-colors hover:bg-white/15"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <span className="relative shrink-0">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_40%,var(--brand-700),var(--brand-950)_80%)] ring-2 ring-brand-100/70">
                  <BotLogo size={38} stars={false} title="" className="-mt-1" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-brand-700 bg-brand-400 shadow-[0_0_8px_oklch(0.72_0.13_252/0.9)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-5 text-primary-foreground">
                  Yuric Bot
                </p>
                <p className="text-xs leading-5 text-brand-100">អនឡាញ · ឆ្លើយតបរហ័ស</p>
              </div>
              <button
                type="button"
                aria-label="បិទការជជែក"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-primary-foreground transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {active ? (
            <>
              {/* conversation */}
              <div
                ref={listRef}
                aria-live="polite"
                className={`flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-brand-100/50 to-card px-4 py-4 ${scroll}`}
              >
                {active.messages.map((m, i) => {
                  const last = i === active.messages.length - 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "bot" && botAvatar}
                      <div
                        className={`flex max-w-[82%] flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <p
                          className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-7 ${
                            m.role === "user"
                              ? "rounded-br-md bg-gradient-to-b from-brand-500 to-brand-700 text-primary-foreground shadow-[0_6px_14px_oklch(0.42_0.19_266/0.3)]"
                              : "rounded-bl-md border border-brand-100 bg-card text-card-foreground shadow-[0_4px_12px_oklch(0.25_0.09_264/0.08)]"
                          }`}
                        >
                          {m.text}
                        </p>
                        {m.actions?.map((a) => (
                          <a
                            key={a.href}
                            href={a.href}
                            target={a.href.startsWith("http") ? "_blank" : undefined}
                            rel="noreferrer"
                            onClick={() => {
                              if (!a.href.startsWith("http")) setOpen(false);
                            }}
                            className="btn-3d inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold leading-6"
                          >
                            {a.href.startsWith("http") ? (
                              <Send className="h-4 w-4" />
                            ) : (
                              <Gamepad2 className="h-4 w-4" />
                            )}
                            {a.label}
                          </a>
                        ))}
                        {last && !typing && m.suggestions && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.suggestions.map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => ask(q)}
                                className="rounded-full border border-brand-100 bg-card px-3 py-1 text-xs font-semibold leading-6 text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-100/60"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex items-end gap-2" aria-label="Yuric Bot កំពុងសរសេរ">
                    {botAvatar}
                    <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-brand-100 bg-card px-4 py-3.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:.3s]" />
                    </span>
                  </div>
                )}
              </div>

              {/* composer */}
              <div className="border-t border-brand-100 bg-card p-3">{composer}</div>
            </>
          ) : (
            <>
              {/* home */}
              <div
                className={`flex-1 overflow-y-auto bg-gradient-to-b from-brand-100/50 to-card px-4 pb-4 pt-4 ${scroll}`}
              >
                <div className="card-3d rounded-2xl p-4">
                  <p className="text-lg font-bold leading-8 text-brand-700">សួស្តី! 👋</p>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    សួរខ្ញុំអំពីហ្គេម កញ្ចប់ ការបង់ប្រាក់ ឬ Player ID បានគ្រប់ពេល
                    ឬជ្រើសសំណួរខាងក្រោម។
                  </p>
                </div>

                {threads.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold leading-6 text-muted-foreground">
                        ការសន្ទនារបស់អ្នក
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="flex items-center gap-1 rounded-full px-2 text-xs font-semibold leading-6 text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        <Plus className="h-3.5 w-3.5" /> ថ្មី
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {threads.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(t.id)}
                            className="group flex w-full items-center gap-3 rounded-2xl border border-brand-100 bg-card px-3 py-2 text-left text-sm leading-6 text-card-foreground transition hover:border-brand-400"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-700 text-primary-foreground">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                            <span className="flex-1 truncate">{t.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mb-2 mt-5 text-xs font-semibold leading-6 text-muted-foreground">
                  សំណួរដែលគេសួរញឹកញាប់
                </p>
                <ul className="space-y-2">
                  {faqs.map((f) => {
                    const FaqIcon = f.icon ?? MessageCircle;
                    return (
                      <li key={f.q}>
                        <button
                          type="button"
                          onClick={() => openFaq(f)}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-brand-100 bg-card px-3 py-2.5 text-left text-sm font-medium leading-6 text-card-foreground shadow-[0_2px_8px_oklch(0.25_0.09_264/0.06)] transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-[0_8px_18px_oklch(0.25_0.09_264/0.12)]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-primary-foreground">
                            <FaqIcon className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{f.q}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ask anything + telegram */}
              <div className="space-y-2.5 border-t border-brand-100 bg-card p-3">
                {composer}
                <a
                  href={`https://t.me/${telegram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-3d flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold"
                >
                  <Send className="h-4 w-4" />
                  ជជែកតាម Telegram · @{telegram}
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
