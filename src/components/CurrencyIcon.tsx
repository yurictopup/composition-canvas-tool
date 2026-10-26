// In-game currency artwork for package cards, so each game shows its own
// currency (Robux, UC, Gems...) instead of one shared diamond.

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

function Diamond() {
  return (
    <>
      <path d="M14 8h20l10 12-20 22L4 20z" fill="#38bdf8" />
      <path d="M4 20h40L24 42z" fill="#0ea5e9" />
      <path d="M14 8l4 12h12l4-12z" fill="#bae6fd" />
      <path d="M18 20l6 22 6-22z" fill="#7dd3fc" />
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

function art(gameId: string) {
  switch (gameId) {
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
      return <Diamond />;
  }
}

export function CurrencyIcon({ gameId, className }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cur-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {art(gameId)}
    </svg>
  );
}
