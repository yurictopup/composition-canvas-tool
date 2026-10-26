// Yuric Bot in Khmer — adapted from src/components/ChatWidget.tsx (yurictopup/composition-canvas-tool@031a95c):
// FAQ threads and Telegram hand-off as before; typed questions are answered by Workers AI
// (chat.functions.ts), or by topic and game (chatBrain.ts) when the AI is not available.
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  Gamepad2,
  Headphones,
  IdCard,
  MessageCircle,
  Send,
  Moon,
  Sparkles,
  SquarePen,
  Sun,
  X,
} from "lucide-react";
import { BotLogo } from "./BotLogo";
import {
  answer,
  DEFAULT_SUGGESTIONS,
  detectGame,
  isOrderQuestion,
  type BotAction,
} from "@/lib/chatBrain";
import { askBot, checkMyOrders } from "@/lib/chat.functions";
import { setStoreTheme, useStorePrefs } from "@/lib/storePrefs";

/** Workers AI answers (slow, about 5-10 seconds); off until a faster model is chosen. */
const USE_AI = false;

type Icon = ComponentType<{ className?: string }>;
type ChatMessage = {
  role: "user" | "bot";
  text: string;
  actions?: BotAction[];
  suggestions?: string[];
  /** Written by the AI rather than the keyword answers. */
  ai?: boolean;
};
type Thread = { id: number; title: string; messages: ChatMessage[] };
export type ChatFaq = { q: string; a: string; icon?: Icon; telegram?: boolean };

export const defaultFaqs: ChatFaq[] = [
  {
    q: "តើបញ្ចូលពេជ្រហ្គេមដោយរបៀបណា?",
    a: "ជ្រើសហ្គេមនៅទំព័រដើម បញ្ចូល Player ID រួចចុច Check ID បន្ទាប់មកជ្រើសកញ្ចប់ និងវិធីបង់ប្រាក់ ហើយចុច Buy Now ពេជ្រនឹងចូលទៅគណនីហ្គេមរបស់អ្នក",
    icon: Gamepad2,
  },
  {
    q: "ការបញ្ចូលចំណាយពេលប៉ុន្មាន?",
    a: "ពេជ្រចូលភ្លាមៗក្នុងរយៈពេល 1-5 នាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់ ដោយបញ្ចូលផ្ទាល់ទៅ Player ID របស់អ្នក (មិនត្រូវការពាក្យសម្ងាត់គណនីទេ) បើយូរជាងនេះ សូមទាក់ទងយើងតាម Telegram យើងនឹងពិនិត្យការបញ្ជាទិញរបស់អ្នកភ្លាមៗ",
    icon: Clock,
  },
  {
    q: "តើអាចបង់ប្រាក់តាមវិធីណាខ្លះ?",
    a: "យើងទទួលការបង់ប្រាក់តាម Bakong បន្ទាប់ពីដាក់ការបញ្ជាទិញ វេបសាយនឹងបង្ហាញចំនួនទឹកប្រាក់ និងលេខកូដសម្រាប់ផ្ទេរ",
    icon: CreditCard,
  },
  {
    q: "តើរក Player ID នៅឯណា?",
    a: "បើកហ្គេម ហើយចូលទៅទំព័រ Profile Player ID របស់អ្នក (និង Zone ID សម្រាប់ហ្គេមខ្លះ) បង្ហាញនៅទីនោះ សូមចម្លងវាឱ្យបានត្រឹមត្រូវ ទៅក្នុងប្រអប់ ID នៅទំព័រហ្គេម",
    icon: IdCard,
  },
  {
    q: "ខ្ញុំបញ្ចូល ID ខុស តើត្រូវធ្វើដូចម្តេច?",
    a: "យើងមិនអាចសងប្រាក់វិញបានទេ ប្រសិនបើអ្នកបញ្ចូល Player ID ខុស ព្រោះពេជ្រត្រូវបានបញ្ចូលទៅ ID នោះផ្ទាល់ សូមពិនិត្យ ID ឱ្យបានត្រឹមត្រូវ ហើយចុច Check ID មុនពេលបង់ប្រាក់ បើការបញ្ជាទិញមិនទាន់ដំណើរការ សូមទាក់ទងយើងតាម Telegram @Yuricccc ភ្លាមៗ ជាមួយវិក្កយបត្រ និង ID ដែលត្រឹមត្រូវ",
    icon: CircleAlert,
    telegram: true,
  },
  {
    q: "តើទាក់ទងហាងដោយផ្ទាល់ដោយរបៀបណា?",
    a: "ចុចប៊ូតុង Telegram ខាងក្រោម ដើម្បីជជែកជាមួយក្រុមការងារយើងដោយផ្ទាល់ យើងរីករាយជួយលើការបញ្ជាទិញ តម្លៃ និងសំណួរផ្សេងៗ",
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
const NEW_CHAT = "ការសន្ទនាថ្មី";
const shortTitle = (text: string) => (text.length > 40 ? text.slice(0, 40) + "…" : text);

export function ChatWidget({
  faqs = defaultFaqs,
  telegram = "Yuricccc",
  gameHref = (id) => `/game/${id}`,
  defaultOpen = false,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { light } = useStorePrefs();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bot messages already shown in full; only new answers type out.
  const seen = useRef(new Set<string>());

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

  // The composer only shows inside a conversation; this opens an empty one.
  function startChat() {
    const thread: Thread = {
      id: nextThreadId++,
      title: NEW_CHAT,
      messages: [
        {
          role: "bot",
          text: "សួស្តី! ខ្ញុំជា Yuric Bot ជំនួយការ AI តើខ្ញុំអាចជួយអ្វីបាន? សួរអំពីហ្គេម តម្លៃ ការបង់ប្រាក់ ឬបញ្ហាការបញ្ជាទិញបាន",
          suggestions: DEFAULT_SUGGESTIONS,
        },
      ],
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
        title: shortTitle(text),
        messages: [{ role: "user", text }],
      };
      setThreads((prev) => [thread, ...prev]);
      setActiveId(id);
    } else {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                // A chat started from "ask AI" is named after its first question.
                title: t.title === NEW_CHAT ? shortTitle(text) : t.title,
                messages: [...t.messages, { role: "user", text }],
              }
            : t,
        ),
      );
    }
    setDraft("");
    setTyping(true);
    const threadId = id;
    const history = [...(active?.messages ?? []), { role: "user" as const, text }];
    const started = Date.now();
    const post = (reply: Omit<ChatMessage, "role">) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, { role: "bot", ...reply }] } : t,
        ),
      );
      setTyping(false);
    };
    const keywords = () => {
      const reply = answer(text, gameHref);
      const wait = 350 + Math.min(500, reply.text.length * 2) - (Date.now() - started);
      timer.current = setTimeout(() => post(reply), Math.max(0, wait));
    };
    // KENZO found the AI too slow, so answers come from the keyword brain right away.
    // Payment problems still get a live check of the customer's orders.
    if (!USE_AI) {
      if (!isOrderQuestion(text)) return keywords();
      checkMyOrders()
        .catch((error: unknown) => ({ unavailable: String(error) }))
        .then((res) =>
          "text" in res ? post({ text: res.text, actions: [telegramAction] }) : keywords(),
        );
      return;
    }
    askBot({ data: { turns: history.map(({ role, text }) => ({ role, text })) } })
      .catch((error: unknown) => ({ unavailable: String(error) }))
      .then((ai) => {
        if ("text" in ai) {
          // The AI writes the answer; the buttons come from what the customer asked about.
          const game = detectGame(text.toLowerCase());
          const actions: BotAction[] = [];
          if (game) actions.push({ label: `បញ្ចូល ${game.name}`, href: gameHref(game.id) });
          // Problems always get the admin button, even if the AI forgot to mention Telegram.
          const kw = answer(text, gameHref);
          if (
            /telegram|តេឡេក្រាម/i.test(ai.text) ||
            kw.actions?.some((a) => a.href.startsWith("http"))
          )
            actions.push(telegramAction);
          post({ text: ai.text, actions, ai: ai.source === "ai" });
          return;
        }
        // No AI (quota used up, or not on Cloudflare): the keyword answers.
        console.warn("Yuric Bot AI unavailable:", ai.unavailable);
        keywords();
      });
  }

  // Dark "AI app" look on every site theme: deep navy glass, aurora glow, blue-violet accents.
  const glass = "border border-[var(--chat-line)] bg-[var(--chat-glass)] backdrop-blur-md";
  const scroll = "[scrollbar-width:thin] [scrollbar-color:var(--chat-line-strong)_transparent]";
  const hint = "AI អាចមានកំហុស · តម្លៃពិតប្រាកដនៅទំព័រហ្គេម";

  const composer = (
    <div className="rounded-[22px] bg-[linear-gradient(120deg,oklch(0.72_0.13_252),oklch(0.6_0.22_290),oklch(0.78_0.12_210))] p-px shadow-[0_0_28px_oklch(0.6_0.2_270/0.35)]">
      <div className="flex items-center gap-2 rounded-[21px] bg-[var(--chat-input)] py-1.5 pl-3.5 pr-1.5">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--chat-accent)]" aria-hidden="true" />
        <input
          id="yt-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(draft)}
          placeholder="សួរ Yuric AI អ្វីក៏បាន…"
          aria-label="សរសេរសំណួររបស់អ្នក"
          maxLength={500}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--chat-fg)] outline-none placeholder:text-[var(--chat-muted)]"
        />
        <button
          type="button"
          aria-label="ផ្ញើសារ"
          onClick={() => ask(draft)}
          disabled={typing || !draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))] text-white shadow-[0_0_16px_oklch(0.6_0.22_280/0.6)] transition hover:scale-105 disabled:scale-100 disabled:opacity-30 disabled:shadow-none"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );

  const botAvatar = (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_35%,oklch(0.5_0.2_268),oklch(0.2_0.08_268)_80%)] shadow-[0_0_14px_oklch(0.6_0.2_270/0.5)] ring-1 ring-white/20">
      <BotLogo size={24} animated={false} stars={false} title="" />
    </span>
  );

  const footer = (
    <div className="relative px-3 pb-2.5 pt-2">
      {composer}
      <p className="mt-1.5 text-center text-[11px] leading-5 text-[var(--chat-muted)]">{hint}</p>
    </div>
  );

  return (
    // Colours come from CSS variables (.yt-chat in styles.css) so the chat follows the light/dark switch.
    <div className="yt-chat contents" data-light={light ? "true" : undefined}>
      {/* launcher — bot head floats freely, with an "ask AI" pill on wide screens */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-8 right-24 z-40 hidden items-center gap-2 rounded-full border border-[var(--chat-line)] bg-[var(--chat-pill)] py-2 pl-2 pr-4 text-sm font-semibold leading-6 text-[var(--chat-fg)] shadow-[0_10px_30px_oklch(0.15_0.08_268/0.5),0_0_24px_oklch(0.6_0.2_280/0.3)] backdrop-blur transition hover:-translate-y-0.5 animate-in fade-in slide-in-from-right-2 duration-500 sm:flex"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          មានសំណួរ? សួរ Yuric AI
        </button>
      )}
      <button
        type="button"
        data-chat-launcher=""
        aria-label={open ? "បិទការជជែក" : "បើកការជជែក"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 grid h-16 w-16 place-items-center transition-transform hover:scale-105 drop-shadow-[0_8px_22px_oklch(0.25_0.09_264/0.55)]"
      >
        {open ? (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(0.55_0.2_264),oklch(0.45_0.24_290))] shadow-[0_0_24px_oklch(0.6_0.22_280/0.6)] ring-1 ring-white/30">
            <X className="h-5 w-5 text-white" />
          </span>
        ) : (
          <>
            <span className="absolute inset-1 animate-ping rounded-full bg-[oklch(0.65_0.2_280/0.3)] [animation-duration:2.4s]" />
            <BotLogo size={60} stars animated title="Yuric Bot" />
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white/40 bg-emerald-400 shadow-[0_0_8px_oklch(0.8_0.18_155/0.9)]" />
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-24 z-40 h-[min(500px,58svh)] rounded-[30px] bg-[linear-gradient(150deg,oklch(0.75_0.13_240/0.9),oklch(0.5_0.24_290/0.6)_45%,oklch(0.3_0.1_268/0.4)_70%,oklch(0.75_0.12_210/0.8))] p-px shadow-[0_30px_90px_oklch(0.12_0.08_268/0.7),0_0_60px_oklch(0.55_0.22_280/0.3)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 sm:inset-x-auto sm:right-5 sm:top-auto sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px]">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[29px] bg-[var(--chat-bg)] font-sans text-[var(--chat-fg)]">
            {/* aurora glow behind everything */}
            <span className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[oklch(0.55_0.2_255/0.45)] blur-3xl yt-aurora" />
            <span className="pointer-events-none absolute -right-20 top-24 h-56 w-56 rounded-full bg-[oklch(0.5_0.24_295/0.35)] blur-3xl yt-aurora [animation-delay:-4s]" />
            <span className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[oklch(0.6_0.14_210/0.25)] blur-3xl yt-aurora [animation-delay:-8s]" />

            {/* header */}
            <div className="relative flex items-center gap-3 border-b border-[var(--chat-line)] px-4 py-3.5">
              {active && (
                <button
                  type="button"
                  aria-label="ត្រឡប់ក្រោយ"
                  onClick={() => setActiveId(null)}
                  className="-ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--chat-fg)] transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-fg)]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <span className="relative shrink-0">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[radial-gradient(circle_at_50%_35%,oklch(0.5_0.2_268),oklch(0.2_0.08_268)_85%)] shadow-[0_0_20px_oklch(0.6_0.2_270/0.45)] ring-1 ring-white/20">
                  <BotLogo size={36} stars={false} title="" className="-mt-0.5" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--chat-bg)] bg-emerald-400 shadow-[0_0_8px_oklch(0.8_0.18_155/0.9)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] font-bold leading-5">
                  Yuric Bot
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))] px-1.5 text-[10px] font-bold uppercase leading-4 tracking-wide">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                </p>
                <p className="truncate text-xs leading-5 text-[var(--chat-muted)]">
                  អនឡាញ · ឆ្លើយភ្លាមៗ 24 ម៉ោង
                </p>
              </div>
              {active && (
                <button
                  type="button"
                  aria-label="ការសន្ទនាថ្មី"
                  title="ការសន្ទនាថ្មី"
                  onClick={startChat}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--chat-fg)] transition hover:text-[var(--chat-fg)] ${glass}`}
                >
                  <SquarePen className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label={light ? "ប្តូរទៅងងឹត" : "ប្តូរទៅភ្លឺ"}
                title={light ? "ប្តូរទៅងងឹត" : "ប្តូរទៅភ្លឺ"}
                onClick={() => setStoreTheme(light ? "dark" : "light")}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--chat-fg)] transition hover:text-[var(--chat-fg)] ${glass}`}
              >
                {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="បិទការជជែក"
                onClick={() => setOpen(false)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--chat-fg)] transition hover:text-[var(--chat-fg)] ${glass}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {active ? (
              <>
                {/* conversation */}
                <div
                  ref={listRef}
                  aria-live="polite"
                  className={`relative flex-1 space-y-4 overflow-y-auto px-4 py-4 ${scroll}`}
                >
                  {active.messages.map((m, i) => {
                    const last = i === active.messages.length - 1;
                    const key = `${active.id}-${i}`;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {m.role === "bot" && botAvatar}
                        <div
                          className={`flex max-w-[84%] flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
                        >
                          <p
                            className={`whitespace-pre-line rounded-[20px] px-4 py-2.5 text-sm leading-7 ${
                              m.role === "user"
                                ? "rounded-br-md bg-[linear-gradient(135deg,oklch(0.6_0.18_258),oklch(0.5_0.24_290))] text-white shadow-[0_8px_22px_oklch(0.5_0.22_280/0.35)]"
                                : `rounded-bl-md text-[var(--chat-fg)] ${glass}`
                            }`}
                          >
                            {m.role === "bot" && !seen.current.has(key) ? (
                              <TypeText text={m.text} onDone={() => seen.current.add(key)} />
                            ) : (
                              m.text
                            )}
                          </p>
                          {m.ai && (
                            <span className="-mt-1 inline-flex items-center gap-1 pl-1 text-[10.5px] font-semibold leading-4 text-[var(--chat-accent)]">
                              <Sparkles className="h-3 w-3" /> Yuric AI
                            </span>
                          )}
                          {m.actions?.map((a) => (
                            <a
                              key={a.href}
                              href={a.href}
                              target={a.href.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer"
                              onClick={() => {
                                if (!a.href.startsWith("http")) setOpen(false);
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))] px-3.5 py-1.5 text-[13px] font-bold leading-6 text-white shadow-[0_0_16px_oklch(0.6_0.22_280/0.4)] transition hover:brightness-110"
                            >
                              {a.href.startsWith("http") ? (
                                <Send className="h-3.5 w-3.5" />
                              ) : (
                                <Gamepad2 className="h-3.5 w-3.5" />
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
                                  className={`rounded-full px-3 py-1 text-xs font-semibold leading-6 text-[var(--chat-fg)] transition hover:border-[var(--chat-line-strong)] hover:bg-[var(--chat-hover)] ${glass}`}
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
                      <span
                        className={`flex items-center gap-2 rounded-[20px] rounded-bl-md px-4 py-2.5 text-xs leading-6 text-[var(--chat-muted)] ${glass}`}
                      >
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.78_0.12_220)]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.7_0.16_260)] [animation-delay:.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.62_0.22_290)] [animation-delay:.3s]" />
                        </span>
                        កំពុងគិត…
                      </span>
                    </div>
                  )}
                </div>
                {footer}
              </>
            ) : (
              <>
                {/* home */}
                <div className={`relative flex-1 overflow-y-auto px-4 pb-4 pt-6 ${scroll}`}>
                  <div className="flex flex-col items-center text-center">
                    <span className="relative grid h-20 w-20 place-items-center">
                      <span className="absolute inset-0 rounded-[26px] bg-[conic-gradient(from_180deg,oklch(0.75_0.13_240),oklch(0.55_0.24_290),oklch(0.78_0.12_210),oklch(0.75_0.13_240))] opacity-80 blur-md" />
                      <span className="relative grid h-20 w-20 place-items-center rounded-[26px] bg-[radial-gradient(circle_at_50%_35%,oklch(0.45_0.2_268),oklch(0.17_0.06_268)_85%)] ring-1 ring-white/25">
                        <BotLogo size={62} stars={false} title="" />
                      </span>
                    </span>
                    <p className="mt-4 bg-[linear-gradient(90deg,var(--chat-title-a),var(--chat-title-b))] bg-clip-text font-khmer text-xl leading-9 text-transparent">
                      សួស្តី! ខ្ញុំជា Yuric Bot
                    </p>
                    <p className="mt-0.5 max-w-[290px] text-[13px] leading-6 text-[var(--chat-muted)]">
                      ជំនួយការ AI របស់ Yuric Topup សួរខ្ញុំអំពីហ្គេម កញ្ចប់ តម្លៃ ការបង់ប្រាក់ ឬ
                      បញ្ហាការបញ្ជាទិញ បានគ្រប់ពេល
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {faqs.map((f) => {
                      const FaqIcon = f.icon ?? MessageCircle;
                      return (
                        <button
                          key={f.q}
                          type="button"
                          onClick={() => openFaq(f)}
                          className={`group flex flex-col gap-2 rounded-2xl p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--chat-line-strong)] hover:bg-[var(--chat-hover)] ${glass}`}
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[linear-gradient(135deg,oklch(0.72_0.13_252/0.3),oklch(0.55_0.24_290/0.3))] text-[var(--chat-accent)] ring-1 ring-[var(--chat-line)] transition group-hover:bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))] group-hover:text-white">
                            <FaqIcon className="h-4 w-4" />
                          </span>
                          <span className="line-clamp-2 text-[12.5px] font-medium leading-[1.7] text-[var(--chat-fg)]">
                            {f.q}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {threads.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold leading-6 text-[var(--chat-muted)]">
                        ការសន្ទនាថ្មីៗ
                      </p>
                      <ul className="space-y-1">
                        {threads.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => setActiveId(t.id)}
                              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-sm leading-6 text-[var(--chat-fg)] transition hover:bg-[var(--chat-hover)]"
                            >
                              <MessageCircle className="h-4 w-4 shrink-0 text-[var(--chat-accent)]" />
                              <span className="flex-1 truncate">{t.title}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--chat-muted)] transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <a
                    href={`https://t.me/${telegram}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-5 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:border-[var(--chat-line-strong)] hover:bg-[var(--chat-hover)] ${glass}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(0.72_0.13_252),oklch(0.55_0.24_290))] shadow-[0_0_14px_oklch(0.6_0.22_280/0.5)]">
                      <Headphones className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-6">ជជែកជាមួយ Admin</span>
                      <span className="block text-xs leading-5 text-[var(--chat-muted)]">
                        Telegram · @{telegram}
                      </span>
                    </span>
                    <Send className="h-4 w-4 shrink-0 text-[var(--chat-accent)]" />
                  </a>
                </div>
                <div className="relative px-3 pb-3 pt-2">
                  <button
                    type="button"
                    onClick={startChat}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(120deg,oklch(0.68_0.15_250),oklch(0.55_0.24_290))] text-sm font-bold text-white shadow-[0_0_28px_oklch(0.6_0.22_280/0.45)] transition hover:brightness-110"
                  >
                    <Sparkles className="h-4 w-4" />
                    ចាប់ផ្តើមជជែកជាមួយ Yuric AI
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Reveals a new answer a few letters at a time, like an AI writing it.
// Steps by grapheme so Khmer vowel signs and subscripts never show half-built.
function TypeText({ text, onDone }: { text: string; onDone: () => void }) {
  const [parts] = useState(() => {
    const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    return Seg
      ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment)
      : Array.from(text);
  });
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    if (n >= parts.length) {
      done.current();
      return;
    }
    const step = Math.max(1, Math.ceil(parts.length / 90));
    const t = setTimeout(() => setN((v) => Math.min(parts.length, v + step)), 16);
    return () => clearTimeout(t);
  }, [n, parts.length]);
  return <>{parts.slice(0, n).join("")}</>;
}
