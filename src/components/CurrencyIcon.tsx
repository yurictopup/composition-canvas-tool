// In-game currency artwork for package cards, so each game shows its own
// currency (Robux, UC, Gems...) instead of one shared diamond.
import diamond from "@/assets/diamond.webp";
import mlbbDiamonds from "@/assets/mlbb-diamonds.webp";
import magicchessDiamonds from "@/assets/magicchess-diamonds.webp";
import pubgUc from "@/assets/pubg-uc.webp";
import { baseGameId } from "@/lib/games";

// Games shown with a picture instead of drawn artwork (server variants use their main game's).
const pictures: Record<string, string> = {
  mlbb: mlbbDiamonds,
  pubg: pubgUc,
  magicchess: magicchessDiamonds,
};

type Props = { gameId: string; className?: string };

function Coin({ fill, ring, text, textColor = "#fff" }: { fill: string; ring: string; text: string; textColor?: string }) {
  return (
    <>
      <circle cx="24" cy="24" r="20" fill={ring} />
      <circle cx="24" cy="24" r="16" fill={fill} />
      <circle cx="24" cy="24" r="16" fill="url(#cur-shine)" />
      <text x="24" y="29" textAnchor="middle" fontSize={text.length > 1 ? 13 : 16} fontWeight="800" fontFamily="system-ui, sans-serif" fill={textColor}>
        {text}
      </text>
    </>
  );
}

function Gem({ light, dark }: { light: string; dark: string }) {
  return (
    <>
      <path d="M24 4l16 10v20L24 44 8 34V14z" fill={dark} />
      <path d="M24 4l16 10-16 10L8 14z" fill={light} />
      <path d="M24 24v20l16-10V14z" fill={dark} opacity="0.75" />
      <path d="M17 13l7-4 7 4-7 4z" fill="#fff" opacity="0.55" />
    </>
  );
}

function Robux() {
  return (
    <>
      <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="#e8b83e" />
      <path d="M24 9l13 7.5v15L24 39l-13-7.5v-15z" fill="#f6d77a" />
      <rect x="17" y="17" width="14" height="14" rx="2" fill="#c8901c" />
      <rect x="20.5" y="20.5" width="7" height="7" fill="#fdf2c8" />
    </>
  );
}

function Crystal({ top, bottom }: { top: string; bottom: string }) {
  return (
    <>
      <path d="M24 2l9 16-9 28-9-28z" fill={bottom} />
      <path d="M24 2l9 16H15z" fill={top} />
      <path d="M24 18v28l9-28z" fill="#000" opacity="0.15" />
      <path d="M6 24l9-6 2 6-2 6zM42 24l-9-6-2 6 2 6z" fill={top} opacity="0.8" />
    </>
  );
}

function Core() {
  return (
    <>
      <circle cx="24" cy="24" r="19" fill="#1e3a8a" />
      <circle cx="24" cy="24" r="13" fill="#3b82f6" />
      <path d="M24 13l5 11-5 11-5-11z" fill="#bfdbfe" />
    </>
  );
}

function GoldBar() {
  return (
    <>
      <path d="M6 34l6-14h24l6 14z" fill="#d4a017" />
      <path d="M12 20l3-8h18l3 8z" fill="#f5c84c" />
      <path d="M6 34h36v4H6z" fill="#a87908" />
    </>
  );
}

function Monochrome() {
  return (
    <>
      <circle cx="24" cy="24" r="19" fill="#111827" />
      <circle cx="24" cy="24" r="13" fill="#f9fafb" />
      <path d="M24 11a13 13 0 0 1 0 26z" fill="#111827" />
      <circle cx="24" cy="24" r="4" fill="#facc15" />
    </>
  );
}

const STAR =
  "M24 6L29.17 17.88L42.07 19.13L32.37 27.72L35.17 40.37L24 33.8L12.83 40.37L15.63 27.72L5.93 19.13L18.83 17.88Z";

// Telegram's rounded star: gold for Stars, purple for Premium.
function TelegramStar({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth="4" strokeLinejoin="round" />
      <path d="M16.5 30.5c4-4.5 9-7.2 14.5-8.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9" />
    </>
  );
}

function art(gameId: string) {
  switch (gameId) {
    case "tgstars":
      return <TelegramStar id="cur-tg-stars" from="#ffd84d" to="#ff9500" />;
    case "tgpremium":
      return <TelegramStar id="cur-tg-premium" from="#c084fc" to="#6d28d9" />;
    case "roblox":
      return <Robux />;
    case "pubg":
      return <Coin fill="#eab308" ring="#a16207" text="UC" />;
    case "hok":
      return <Coin fill="#f59e0b" ring="#92400e" text="T" />;
    case "codm":
      return <Coin fill="#f97316" ring="#9a3412" text="CP" />;
    case "valorant":
      return <Coin fill="#ef4444" ring="#7f1d1d" text="VP" />;
    case "eafc":
      return <Coin fill="#10b981" ring="#065f46" text="FC" />;
    case "lol":
      return <Coin fill="#c8aa6e" ring="#785a28" text="RP" />;
    case "hi3":
      return <Crystal top="#bae6fd" bottom="#0284c7" />;
    case "deltaforce":
      return <Coin fill="#22c55e" ring="#14532d" text="Δ" />;
    case "arenabreakout":
      return <Coin fill="#d6a542" ring="#78350f" text="B" />;
    case "wildrift":
      return <Core />;
    case "bloodstrike":
      return <GoldBar />;
    case "coc":
    case "clashroyale":
    case "brawlstars":
      return <Gem light="#86efac" dark="#16a34a" />;
    case "genshin":
      return <Crystal top="#e9d5ff" bottom="#8b5cf6" />;
    case "starrail":
      return <Crystal top="#fbcfe8" bottom="#c026d3" />;
    case "zzz":
      return <Monochrome />;
    default:
      return null;
  }
}

/** The picture a game's package tiles show instead of a drawn icon, if any (for preloading). */
export function currencyPicture(gameId: string): string | undefined {
  const picture = pictures[baseGameId(gameId)];
  return picture ?? (art(gameId) ? undefined : diamond);
}

export function CurrencyIcon({ gameId, className }: Props) {
  const picture = pictures[baseGameId(gameId)];
  const drawn = picture ? null : art(gameId);
  // Diamond games without their own picture (Free Fire, Magic Chess...) use the HD diamond.
  if (!drawn) {
    return (
      <img
        src={picture ?? diamond}
        alt=""
        aria-hidden="true"
        className={`object-contain ${className ?? ""}`}
      />
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cur-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {drawn}
    </svg>
  );
}
