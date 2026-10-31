// Yuric Bot's answers: matches a customer's question (Khmer or English) to a topic and a game,
// and answers from the shop's real catalogue (src/lib/games.ts) and ID rules (src/lib/player-id.ts).
// Prices come from the live price table (src/lib/prices.ts) when the widget has loaded it;
// without it the bot lists the packages and points to the game page.
import { games, getHotItems, getPackages, store } from "@/lib/games";
import { getIdConfig } from "@/lib/player-id";
import type { PriceMap } from "@/lib/prices";

export type BotAction = { label: string; href: string };
export type BotReply = { text: string; actions?: BotAction[]; suggestions?: string[] };

type Game = (typeof games)[number];

const TELEGRAM = store.telegram; // "@Yuricccc"
const TELEGRAM_URL = "https://t.me/" + TELEGRAM.replace(/^@/, "");

export const DEFAULT_SUGGESTIONS = [
  "តម្លៃ MLBB",
  "តម្លៃ Free Fire",
  "លេខកូដបញ្ចុះតម្លៃ",
  "បង់ប្រាក់តាមអ្វី?",
  "ហ្គេមអ្វីខ្លះ?",
];

// Words that point at each game. Latin aliases match as whole words; Khmer ones as substrings.
const GAME_ALIASES: Record<string, string[]> = {
  mlbb: ["mlbb", "mobile legends", "mobile legend", "ml", "ម៉ូបាយលេជិន", "ម៉ូបាយ", "អឹមអិល"],
  ff: ["free fire", "freefire", "ff", "ហ្វ្រីហ្វាយ"],
  roblox: ["roblox", "robux", "រ៉ូប្លុក", "រ៉ូបុក"],
  magicchess: ["magic chess", "mcgg", "magicchess"],
  pubg: ["pubg", "pubg mobile", "uc", "ប៉ាប់ជី", "ពាប់ជី"],
  hok: ["honor of kings", "hok"],
  wildrift: ["wild rift", "wildrift", "wild cores"],
  eafc: ["ea fc", "eafc", "fc mobile", "fifa", "fc points"],
  lol: ["league of legends", "lol", "riot points"],
  hi3: ["honkai impact", "hi3", "honkai impact 3rd"],
  bloodstrike: ["blood strike", "bloodstrike"],
  genshin: ["genshin", "genshin impact", "genesis"],
  starrail: ["star rail", "honkai", "hsr"],
  tgstars: ["telegram stars", "telegram star", "tg stars", "stars", "ផ្កាយ telegram"],
  tgpremium: ["telegram premium", "tg premium", "premium"],
  deltaforce: ["delta force", "deltaforce"],
  arenabreakout: ["arena breakout"],
  zzz: ["zenless", "zzz"],
  valorant: ["valorant", "vp"],
};

// Topic keywords. Each topic's score is the number of its keywords found in the message.
const TOPICS: Record<string, string[]> = {
  greet: ["សួស្តី", "ជំរាបសួរ", "hello", "hi", "hey", "សួស្ដី", "bong"],
  thanks: ["អរគុណ", "thank", "thanks", "thx", "អូខេ"],
  price: [
    "តម្លៃ",
    "ថ្លៃ",
    "ប៉ុន្មានលុយ",
    "ប៉ុន្មាន$",
    "ដុល្លារ",
    "price",
    "cost",
    "how much",
    "$",
    "ចុះតម្លៃ",
    "ថោក",
  ],
  topup: [
    "បញ្ចូល",
    "ទិញ",
    "ដាក់ពេជ្រ",
    "របៀប",
    "ធ្វើម៉េច",
    "ធ្វើយ៉ាងម៉េច",
    "top up",
    "topup",
    "buy",
    "order",
    "how to",
    "how do",
  ],
  delivery: [
    "ប៉ុន្មាននាទី",
    "យូរ",
    "រយៈពេល",
    "ពេលណា",
    "ឆាប់",
    "លឿន",
    "នាទី",
    "delivery",
    "how long",
    "when",
    "fast",
    "time",
  ],
  late: [
    "មិនទាន់ចូល",
    "មិនចូល",
    "អត់ចូល",
    "មិនទាន់ទទួល",
    "អត់ទាន់",
    "បាត់",
    "អតចូល",
    "អត់មាន",
    "អតមាន",
    "មិនមាន",
    "មិនទាន់មាន",
    "បង់ហើយ",
    "បង់លុយហើយ",
    "បង់ប្រាក់ហើយ",
    "ជោគជ័យហើយ",
    "កាត់លុយ",
    "paid",
    "not received",
    "didn't receive",
    "not arrive",
    "missing",
    "late",
  ],
  payment: [
    "បង់",
    "ការបង់ប្រាក់",
    "ទូទាត់",
    "aba",
    "khqr",
    "wing",
    "acleda",
    "bakong",
    "payment",
    "pay",
    "qr",
    "កាត",
    "card",
    "ធនាគារ",
    "bank",
  ],
  playerId: [
    "player id",
    "id",
    "zone",
    "uid",
    "អាយឌី",
    "លេខសម្គាល់",
    "រកid",
    "រក id",
    "server",
    "username",
    "riot id",
    "player tag",
  ],
  wrongId: [
    "id ខុស",
    "idខុស",
    "ខុស id",
    "ខុសid",
    "បញ្ចូលខុស",
    "វាយខុស",
    "wrong id",
    "wrong",
    "mistake",
    "ខុស",
  ],
  contact: [
    "telegram",
    "តេឡេក្រាម",
    "admin",
    "អាដមីន",
    "ទាក់ទង",
    "មនុស្ស",
    "និយាយជាមួយ",
    "contact",
    "human",
    "staff",
    "support",
    "ជំនួយ",
    "help",
  ],
  hours: ["ម៉ោង", "បើក", "បិទ", "ថ្ងៃអាទិត្យ", "យប់", "24", "open", "close", "hours"],
  safety: ["សុវត្ថិភាព", "ទុកចិត្ត", "បោក", "ពិត", "safe", "trust", "scam", "legit", "real"],
  games: [
    "ហ្គេមអ្វីខ្លះ",
    "មានហ្គេម",
    "ហ្គេមណាខ្លះ",
    "ហ្គេមទាំងអស់",
    "games",
    "which game",
    "what game",
    "list",
  ],
  refund: ["ដកលុយ", "សងលុយ", "បង្វិល", "refund", "cancel", "បោះបង់"],
  promo: ["promo", "promo code", "coupon", "voucher", "discount", "កូដ", "លេខកូដ", "បញ្ចុះ", "បញ្ចុះតម្លៃ", "ប្រូម៉ូ"],
};

const isLatin = (w: string) => [...w].every((c) => c.charCodeAt(0) < 128);
function has(text: string, word: string) {
  if (!isLatin(word)) return text.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

/** The game a (lowercased) message names, preferring the longest alias. */
export function detectGame(text: string): Game | undefined {
  let best: { g: Game; len: number } | undefined;
  for (const g of games) {
    for (const alias of [g.name.toLowerCase(), ...(GAME_ALIASES[g.id] ?? [])]) {
      if (has(text, alias) && (!best || alias.length > best.len)) best = { g, len: alias.length };
    }
  }
  return best?.g;
}

function topScores(text: string) {
  const scores: [string, number][] = Object.entries(TOPICS).map(([t, words]) => [
    t,
    words.filter((w) => has(text, w)).length,
  ]);
  // Ties go to the more specific topic; greetings and thanks only lead when nothing else matched.
  const weak = (t: string) => (t === "greet" || t === "thanks" ? 1 : 0);
  return scores
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || weak(a[0]) - weak(b[0]))
    .map(([t]) => t);
}

function idHelp(g: Game) {
  const c = getIdConfig(g.id);
  const fields = c.secondary ? `${c.primary.label} និង ${c.secondary.label}` : c.primary.label;
  const opts = c.secondary?.options ? ` (Server៖ ${c.secondary.options.join(", ")})` : "";
  return `សម្រាប់ ${g.name} សូមបញ្ចូល ${fields}${opts}`;
}

function packagesLine(g: Game) {
  const pk = getPackages(g.id);
  if (!pk.length) return "";
  const hot = pk.find((p) => p.hot);
  return `កញ្ចប់ដែលមាន៖ ${pk.map((p) => p.amt).join(", ")} ${g.unit}${hot ? ` (ពេញនិយម៖ ${hot.amt})` : ""}`;
}

/**
 * Today's prices from the live table: a few currency packs (cheapest first) and the
 * passes. Packages the owner switched off are left out. Null without live prices.
 */
export function priceLines(g: Game, prices: PriceMap | null | undefined, max = 8): string | null {
  if (!prices) return null;
  const live = (amt: string) => {
    const row = prices.get(`${g.id}|${amt} ${g.unit}`);
    return row && row.active ? row.price_usd : null;
  };
  const packs = getPackages(g.id)
    .map((p) => ({ name: `${p.amt} ${g.unit}`, price: live(p.amt), hot: !!p.hot }))
    .filter((p): p is { name: string; price: number; hot: boolean } => p.price !== null)
    .sort((a, b) => a.price - b.price);
  const passes = getHotItems(g.id)
    .map((h) => ({ name: h.label, price: live(h.label) }))
    .filter((p): p is { name: string; price: number } => p.price !== null)
    .slice(0, 4);
  if (!packs.length && !passes.length) return null;
  const lines = packs.slice(0, max).map((p) => `• ${p.name} = $${p.price.toFixed(2)}${p.hot ? " (ពេញនិយម)" : ""}`);
  if (packs.length > max) lines.push(`… និង ${packs.length - max} កញ្ចប់ទៀតនៅទំព័រហ្គេម`);
  if (passes.length) {
    lines.push("Pass / កញ្ចប់ពិសេស៖");
    lines.push(...passes.map((p) => `• ${p.name} = $${p.price.toFixed(2)}`));
  }
  return lines.join("\n");
}

const gameAction = (g: Game, href: (id: string) => string): BotAction => ({
  label: `បញ្ចូល ${g.name}`,
  href: href(g.id),
});
const telegramAction: BotAction = { label: `ជជែកតាម Telegram · ${TELEGRAM}`, href: TELEGRAM_URL };

// "How do I pay?" or "can I pay with ABA?" asks for the steps, not for the customer's orders.
const HOW_WORDS = [
  "how",
  "can i",
  "which",
  "what",
  "របៀប",
  "ធ្វើម៉េច",
  "ធ្វើយ៉ាងម៉េច",
  "អាច",
  "បានទេ",
  "អ្វី",
];

/** True when a message is about a payment or an order that hasn't arrived. */
export function isOrderQuestion(raw: string): boolean {
  const text = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const topics = topScores(text);
  if (["late", "refund", "wrongId"].some((t) => topics.includes(t))) return true;
  return topics.includes("payment") && !HOW_WORDS.some((w) => has(text, w));
}

export function answer(
  raw: string,
  gameHref: (id: string) => string = (id) => `/game/${id}`,
  prices?: PriceMap | null,
): BotReply {
  const text = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const game = detectGame(text);
  const topics = topScores(text);
  const has_ = (t: string) => topics.includes(t);

  // Promo codes: how to use one; the bot never makes up a code.
  if (has_("promo") && !has_("late") && !has_("refund")) {
    return {
      text: `បាទ យើងមានលេខកូដបញ្ចុះតម្លៃ (Promo Code) ម្តងម្កាល ៖\n១. ជ្រើសហ្គេម និងកញ្ចប់\n២. នៅ "សង្ខេបការបញ្ជាទិញ" វាយលេខកូដក្នុងប្រអប់ លេខកូដបញ្ចុះតម្លៃ ហើយចុច ប្រើ\n៣. តម្លៃថ្មីបង្ហាញភ្លាមៗ រួចចុច បញ្ជាទិញ\nលេខកូដថ្មីៗ ប្រកាសនៅ Telegram ${TELEGRAM} លេខកូដមួយមានកំណត់ចំនួនដង និងថ្ងៃផុតកំណត់ ហើយមិនប្រើបានលើ Roblox និង Telegram ទេ`,
      actions: [telegramAction],
      suggestions: ["តម្លៃ MLBB", "តម្លៃ Free Fire"],
    };
  }

  // Roblox works differently from every other game.
  if (game?.id === "roblox") {
    const list = priceLines(game, prices);
    return {
      text: `យើងលក់ Robux ជាលេខកូដ (Gift Code) ៖ ជ្រើសចំនួន Robux ហើយបង់ប្រាក់តាម ABA KHQR លេខកូដបង្ហាញភ្លាមៗនៅទំព័រការបញ្ជាទិញ បន្ទាប់មកចូល roblox.com/redeem ក្នុង browser ហើយ Paste លេខកូដ Robux ចូលភ្លាមៗ យើងមិនសុំលេខសម្ងាត់ទេ${list ? `\n\nតម្លៃថ្ងៃនេះ៖\n${list}` : ""}`,
      actions: [gameAction(game, gameHref), telegramAction],
      suggestions: ["ហ្គេមអ្វីខ្លះ?", "បង់ប្រាក់តាមអ្វី?"],
    };
  }

  // Telegram Stars and Premium go to a Telegram username, not a game ID.
  if (game?.id === "tgstars" || game?.id === "tgpremium") {
    const list = priceLines(game, prices);
    const what = game.id === "tgstars" ? "Telegram Stars" : "Telegram Premium (3, 6 ឬ 12 ខែ)";
    return {
      text: `យើងលក់ ${what} ដោយស្វ័យប្រវត្តិ ៖ វាយ Telegram username របស់អ្នក (ឧ. @username) ចុច ពិនិត្យ ID ជ្រើសកញ្ចប់ ហើយបង់តាម ABA KHQR វាចូលគណនី Telegram របស់អ្នកក្នុងពីរបីនាទី នៅទំព័រ Telegram អាចប្តូររវាង Premium និង Stars បាន${list ? `\n\nតម្លៃថ្ងៃនេះ៖\n${list}` : ""}`,
      actions: [gameAction(game, gameHref), telegramAction],
      suggestions: [game.id === "tgstars" ? "តម្លៃ Telegram Premium" : "តម្លៃ Telegram Stars", "បង់ប្រាក់តាមអ្វី?"],
    };
  }

  if (has_("late") || has_("refund")) {
    return {
      text: `សុំទោសចំពោះការរង់ចាំ! សូមធ្វើតាមជំហាននេះ៖\n១. រង់ចាំបន្តិច ជាធម្មតាពេជ្រចូលក្នុង 1-5 នាទី បន្ទាប់ពីបង់ប្រាក់\n២. ពិនិត្យស្ថានភាពការបញ្ជាទិញនៅទំព័រ Profile\n៣. ពិនិត្យថា Player ID ក្នុងការបញ្ជាទិញត្រឹមត្រូវ\n៤. បើនៅតែមិនទាន់ចូល សូមផ្ញើរូបវិក្កយបត្របង់ប្រាក់ និង Player ID ទៅ Admin តាម Telegram ${TELEGRAM} Admin នឹងដោះស្រាយឱ្យភ្លាមៗ`,
      actions: [telegramAction],
    };
  }

  if (has_("wrongId") && (has_("playerId") || text.includes("ខុស") || text.includes("wrong"))) {
    return {
      text: `យើងមិនអាចសងប្រាក់វិញបានទេ ប្រសិនបើអ្នកបញ្ចូល Player ID ខុស ព្រោះពេជ្រត្រូវបានបញ្ចូលទៅ ID នោះផ្ទាល់ បើការបញ្ជាទិញមិនទាន់ដំណើរការ សូមទាក់ទង Admin តាម Telegram ${TELEGRAM} ភ្លាមៗ ដោយភ្ជាប់វិក្កយបត្រ និង ID ដែលត្រឹមត្រូវ មុនពេលបង់លើកក្រោយ សូមចុច Check ID ដើម្បីពិនិត្យ ID ម្តងទៀត`,
      actions: [telegramAction],
    };
  }

  if (has_("price")) {
    if (game) {
      const list = priceLines(game, prices);
      return {
        text: list
          ? `តម្លៃ ${g(game)} ថ្ងៃនេះ៖\n${list}\n\nចុចប៊ូតុងខាងក្រោមដើម្បីទិញ មានលេខកូដបញ្ចុះតម្លៃ? ដាក់វានៅពេលបញ្ជាទិញ`
          : `${packagesLine(game)} តម្លៃថ្មីបំផុតនៃកញ្ចប់នីមួយៗ បង្ហាញនៅទំព័រ ${g(game)} ចុចប៊ូតុងខាងក្រោមដើម្បីមើល`,
        actions: [gameAction(game, gameHref)],
        suggestions: [`ID ${g(game)}`, "បង់ប្រាក់តាមអ្វី?", "លេខកូដបញ្ចុះតម្លៃ"],
      };
    }
    return {
      text: `តម្លៃនៃកញ្ចប់នីមួយៗ បង្ហាញនៅទំព័រហ្គេមនីមួយៗ សូមប្រាប់ឈ្មោះហ្គេម ខ្ញុំនឹងប្រាប់កញ្ចប់ដែលមាន ហើយភ្ជាប់ទៅទំព័រនោះ`,
      actions: [telegramAction],
      suggestions: ["តម្លៃ MLBB", "តម្លៃ Free Fire", "តម្លៃ PUBG UC"],
    };
  }

  if (has_("playerId") && game) {
    return {
      text: `${idHelp(game)} បើកហ្គេម ហើយចូលទៅទំព័រ Profile អ្នកនឹងឃើញលេខនេះ ចម្លងវាឱ្យត្រឹមត្រូវ រួចចុច Check ID`,
      actions: [gameAction(game, gameHref)],
    };
  }

  if (game && (has_("topup") || topics.length === 0)) {
    const list = priceLines(game, prices, 5);
    return {
      text: `${game.name} ប្រើ ${game.unit} ${idHelp(game)} ជំហាន៖ បញ្ចូល ID → ចុច ពិនិត្យ ID → ជ្រើសកញ្ចប់ → បញ្ជាទិញ → បង់តាម ABA KHQR${list ? `\n\nតម្លៃថ្ងៃនេះ៖\n${list}` : ` ${packagesLine(game)}`}`,
      actions: [gameAction(game, gameHref)],
      suggestions: [`តម្លៃ ${game.name}`, "បង់ប្រាក់តាមអ្វី?", "ប៉ុន្មាននាទីចូល?"],
    };
  }

  const first = topics[0];
  switch (first) {
    case "greet":
      return {
        text: "សួស្តី! ខ្ញុំជា Yuric Bot អ្នកចង់បញ្ចូលពេជ្រហ្គេមអ្វី? ខ្ញុំអាចប្រាប់អំពីកញ្ចប់ ការបង់ប្រាក់ Player ID និងពេលវេលាដែលពេជ្រចូល",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    case "thanks":
      return {
        text: "រីករាយបានជួយ! បើមានសំណួរទៀត សួរខ្ញុំបានគ្រប់ពេល",
        suggestions: ["របៀបបញ្ចូលពេជ្រ", "ហ្គេមអ្វីខ្លះ?"],
      };
    case "topup":
      return {
        text: "ងាយស្រួលណាស់៖ ១. ជ្រើសហ្គេមនៅទំព័រដើម ២. បញ្ចូល Player ID ហើយចុច Check ID ៣. ជ្រើសកញ្ចប់ ៤. ជ្រើសវិធីបង់ប្រាក់ ៥. ចុច បញ្ជាទិញ ពេជ្រនឹងចូលគណនីហ្គេមរបស់អ្នក ប្រាប់ឈ្មោះហ្គេម ខ្ញុំនឹងប្រាប់លម្អិត",
        suggestions: ["Mobile Legends", "Free Fire", "PUBG Mobile"],
      };
    case "delivery":
      return {
        text: "ពេជ្រចូលភ្លាមៗក្នុងរយៈពេល 1-5 នាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់ ដោយបញ្ចូលផ្ទាល់ទៅ Player ID របស់អ្នក (មិនត្រូវការពាក្យសម្ងាត់គណនីទេ) បើយូរជាងនេះ សូមទាក់ទង Admin តាម Telegram យើងនឹងពិនិត្យភ្លាមៗ",
        actions: [telegramAction],
      };
    case "payment":
      return {
        text: "យើងទទួលការបង់ប្រាក់តាម ABA KHQR ៖ បង់បានពីកម្មវិធីធនាគារណាមួយ (ABA, ACLEDA, Wing, Bakong, Canadia …) នៅលើទូរស័ព្ទ ពេលចុច បញ្ជាទិញ កម្មវិធីធនាគារនឹងបើកដោយខ្លួនឯង ដោយមិនចាំបាច់ថតរូប QR ទេ នៅលើកុំព្យូទ័រ សូមស្កេន QR ដោយទូរស័ព្ទ ប្រព័ន្ធបញ្ជាក់ការបង់ប្រាក់ដោយស្វ័យប្រវត្តិ",
        suggestions: ["របៀបបញ្ចូលពេជ្រ", "ប៉ុន្មាននាទីចូល?", "លេខកូដបញ្ចុះតម្លៃ"],
      };
    case "playerId":
      return {
        text: "បើកហ្គេម ហើយចូលទៅទំព័រ Profile Player ID (និង Zone ID សម្រាប់ហ្គេមខ្លះដូចជា Mobile Legends) បង្ហាញនៅទីនោះ ប្រាប់ឈ្មោះហ្គេម ខ្ញុំនឹងប្រាប់ថាត្រូវបញ្ចូលអ្វីខ្លះ",
        suggestions: ["ID Mobile Legends", "ID Genshin", "ID Free Fire"],
      };
    case "wrongId":
      return {
        text: `យើងមិនអាចសងប្រាក់វិញបានទេ ប្រសិនបើអ្នកបញ្ចូល Player ID ខុស ព្រោះពេជ្រត្រូវបានបញ្ចូលទៅ ID នោះផ្ទាល់ បើការបញ្ជាទិញមិនទាន់ដំណើរការ សូមទាក់ទង Admin តាម Telegram ${TELEGRAM} ភ្លាមៗ ជាមួយវិក្កយបត្រ និង ID ដែលត្រឹមត្រូវ`,
        actions: [telegramAction],
      };
    case "contact":
      return {
        text: `អ្នកអាចជជែកជាមួយ Admin ដោយផ្ទាល់តាម Telegram ${TELEGRAM} ចុចប៊ូតុងខាងក្រោម`,
        actions: [telegramAction],
      };
    case "hours":
      return {
        text: `ហាងបម្រើ ${store.hours === "24 Hours" ? "24 ម៉ោង" : store.hours} អ្នកអាចបញ្ជាទិញបានគ្រប់ពេល ហើយទាក់ទង Admin តាម Telegram ${TELEGRAM}`,
        actions: [telegramAction],
      };
    case "safety":
      return {
        text: `Yuric Topup អាចទុកចិត្តបាន អ្នកបង់ប្រាក់តាម ABA KHQR ផ្ទាល់ពីកម្មវិធីធនាគាររបស់អ្នក យើងមិនដែលសុំពាក្យសម្ងាត់គណនីហ្គេមទេ ត្រូវការតែ Player ID ប៉ុណ្ណោះ ហើយការបញ្ជាទិញនីមួយៗអាចពិនិត្យបាន បើមានបញ្ហាអ្វី សូមទាក់ទង Admin តាម Telegram ${TELEGRAM}`,
        actions: [telegramAction],
      };
    case "games":
      return {
        text: `ហ្គេម និងទំនិញដែលយើងមាន៖ ${games.map((x) => x.name).join(", ")} សរសេរឈ្មោះហ្គេម ខ្ញុំនឹងប្រាប់តម្លៃថ្ងៃនេះ និង ID ដែលត្រូវការ`,
        suggestions: ["តម្លៃ MLBB", "តម្លៃ PUBG", "តម្លៃ Telegram Stars"],
      };
    case "refund":
      return {
        text: `ចំពោះការសងប្រាក់ ឬបោះបង់ការបញ្ជាទិញ សូមទាក់ទង Admin តាម Telegram ${TELEGRAM} ជាមួយវិក្កយបត្ររបស់អ្នក ចំណាំ៖ យើងមិនអាចសងប្រាក់វិញបានទេ ប្រសិនបើអ្នកបញ្ចូល Player ID ខុស ព្រោះពេជ្រត្រូវបានបញ្ចូលទៅ ID នោះផ្ទាល់`,
        actions: [telegramAction],
      };
  }

  if (game) {
    const list = priceLines(game, prices, 5);
    return {
      text: `${game.name} ប្រើ ${game.unit} ${idHelp(game)}${list ? `\n\nតម្លៃថ្ងៃនេះ៖\n${list}` : ` ${packagesLine(game)}`}`,
      actions: [gameAction(game, gameHref)],
    };
  }

  return {
    text: `សុំទោស ខ្ញុំមិនទាន់យល់សំណួរនេះច្បាស់ទេ សាកសួរម្តងទៀតដោយប្រើពាក្យដូចជា "តម្លៃ", "បង់ប្រាក់", "Player ID" ឬឈ្មោះហ្គេម ឬជជែកជាមួយ Admin ដោយផ្ទាល់តាម Telegram ${TELEGRAM}`,
    actions: [telegramAction],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

const g = (game: Game) => game.name;
