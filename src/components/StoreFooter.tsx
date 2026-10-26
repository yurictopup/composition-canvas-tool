import { Link } from "@tanstack/react-router";
import { Clock, Gem, Headphones, Home, Receipt, ShieldCheck, Zap } from "lucide-react";
import { games, store } from "@/lib/games";
import { useStorePrefs } from "@/lib/storePrefs";
import { BotLogo } from "@/components/BotLogo";

const telegramUrl = `https://t.me/${store.telegram.replace("@", "")}`;
const popular = ["mlbb", "ff", "pubg", "hok", "roblox"].map((id) => games.find((g) => g.id === id)!);

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.3a1.2 1.2 0 0 0-1.62-1.37L2.83 9.67c-1.1.43-1.08 1.99.03 2.38l4.3 1.5 1.67 5.3c.27.86 1.35 1.13 1.98.5l2.4-2.38 4.47 3.3c.8.6 1.95.16 2.15-.82zM9.4 13.9l8.26-6.1c.3-.22.62.18.36.43l-6.8 6.4-.27 2.9z" />
    </svg>
  );
}

function Brand({ big = false }: { big?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_6px_18px_rgb(47_95_224/0.45)] ${big ? "h-12 w-12" : "h-10 w-10"}`}>
        <Gem size={big ? 24 : 20} strokeWidth={2.2} />
      </span>
      <span className={`font-display font-black tracking-wide text-on-dark ${big ? "text-2xl" : "text-xl"}`}>
        YURIC<span className="text-brand-400"> TOPUP</span>
      </span>
    </Link>
  );
}

function KhqrBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
      <span className="rounded-[3px] bg-[#E1232E] px-1.5 py-0.5 text-[11px] font-extrabold leading-none tracking-wide text-white">KHQR</span>
      <span className="text-xs font-semibold text-[#142650]">Bakong</span>
    </span>
  );
}

function TelegramButton({ variant = "solid" }: { variant?: "solid" | "white" }) {
  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
        variant === "white"
          ? "bg-white text-[#1b6fc4] shadow-[0_6px_18px_rgb(0_0_0/0.18)]"
          : "bg-[#229ED9] text-white shadow-[0_6px_18px_rgb(34_158_217/0.4)]"
      }`}
    >
      <TelegramIcon />
      {store.telegram}
    </a>
  );
}

function Copyright() {
  const { t } = useStorePrefs();
  return (
    <p className="text-xs text-on-dark-muted">
      © 2026 {store.name}. {t("All rights reserved.")}
    </p>
  );
}

/* Option A: four columns, Vuexy-style */
function FooterColumns() {
  const { t } = useStorePrefs();
  const head = "mb-4 text-sm font-bold uppercase tracking-wider text-on-dark";
  const link = "flex items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-brand-400";
  return (
    <footer id="help" className="store-footer mt-10">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="col-span-2 lg:col-span-1">
          <Brand />
          <p className="mt-4 max-w-xs text-sm leading-[1.8] text-on-dark-muted">{t("Fast and safe game top-ups in Cambodia.")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { Icon: Zap, label: "1-5 min" },
              { Icon: ShieldCheck, label: "Secure payment" },
              { Icon: Clock, label: store.hours },
            ].map(({ Icon, label }) => (
              <span key={label} className="store-footer-chip">
                <Icon size={14} className="text-brand-400" />
                {t(label)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className={head}>{t("Menu")}</h3>
          <ul className="space-y-3">
            <li><Link to="/" className={link}><Home size={15} />{t("Home")}</Link></li>
            <li><Link to="/profile" className={link}><Receipt size={15} />{t("My orders")}</Link></li>
            <li><a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={link}><Headphones size={15} />{t("Support")}</a></li>
          </ul>
        </div>
        <div>
          <h3 className={head}>{t("Popular games")}</h3>
          <ul className="space-y-2.5">
            {popular.map((g) => (
              <li key={g.id}>
                <Link to="/game/$gameId" params={{ gameId: g.id }} className={link}>
                  <img src={g.icon} alt="" className="h-6 w-6 rounded-md object-cover" />
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="store-footer-card col-span-2 p-5 lg:col-span-1">
          <h3 className="text-base font-bold text-on-dark">{t("Need help?")}</h3>
          <p className="mt-1.5 text-sm leading-[1.8] text-on-dark-muted">{t("Message us on Telegram, we reply 24 hours.")}</p>
          <div className="mt-4"><TelegramButton /></div>
          <div className="mt-5 border-t border-[var(--store-footer-line)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-dark-muted">{t("We accept")}</p>
            <KhqrBadge />
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--store-footer-line)]">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-2 px-4 py-5 pb-20 sm:flex-row sm:px-6 sm:pb-5 sm:pr-24">
          <Copyright />
          <p className="text-xs text-on-dark-muted">{t("Made in Cambodia")}</p>
        </div>
      </div>
    </footer>
  );
}

/* Option B: big help banner with the bot, then one slim row */
function FooterBanner() {
  const { t } = useStorePrefs();
  return (
    <footer id="help" className="mt-10">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2fa4e7] px-6 py-8 text-white shadow-[0_18px_40px_rgb(7_28_80/0.35)] sm:px-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-40 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <BotLogo size={84} />
            <div className="flex-1">
              <h3 className="text-2xl font-bold leading-[1.6]">{t("Need help? Chat with us")}</h3>
              <p className="mt-1 text-sm leading-[1.8] text-white/85">{t("Message us on Telegram, we reply 24 hours.")}</p>
            </div>
            <TelegramButton variant="white" />
          </div>
        </div>
      </div>
      <div className="store-footer mt-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:justify-between">
          <Brand />
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-on-dark-muted">
            <Link to="/" className="hover:text-brand-400">{t("Home")}</Link>
            <Link to="/profile" className="hover:text-brand-400">{t("My orders")}</Link>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">Telegram</a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-on-dark-muted">{t("We accept")}</span>
            <KhqrBadge />
          </div>
        </div>
        <div className="border-t border-[var(--store-footer-line)] px-4 py-4 pb-20 text-center sm:pb-4"><Copyright /></div>
      </div>
    </footer>
  );
}

/* Option C: centered and minimal */
function FooterCentered() {
  const { t } = useStorePrefs();
  const pill = "store-footer-chip px-4 py-2 text-sm hover:text-brand-400";
  return (
    <footer id="help" className="store-footer mt-10">
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center px-4 py-12 text-center sm:px-6">
        <Brand big />
        <p className="mt-4 max-w-md text-sm leading-[1.8] text-on-dark-muted">{t("Fast and safe game top-ups in Cambodia.")}</p>
        <nav className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link to="/" className={pill}><Home size={15} />{t("Home")}</Link>
          <Link to="/profile" className={pill}><Receipt size={15} />{t("My orders")}</Link>
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={pill}><TelegramIcon size={15} />Telegram</a>
        </nav>
        <div className="mt-8 grid w-full grid-cols-3 gap-3 sm:gap-4">
          {[
            { Icon: Zap, title: "1-5 min", sub: "Instant delivery" },
            { Icon: ShieldCheck, title: "KHQR", sub: "Secure payment" },
            { Icon: Headphones, title: store.hours, sub: "Support" },
          ].map(({ Icon, title, sub }) => (
            <div key={sub} className="store-footer-card flex flex-col items-center gap-1.5 px-2 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-400/15 text-brand-400"><Icon size={19} /></span>
              <span className="text-sm font-bold text-on-dark">{t(title)}</span>
              <span className="text-xs text-on-dark-muted">{t(sub)}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-3">
          <span className="text-xs text-on-dark-muted">{t("We accept")}</span>
          <KhqrBadge />
        </div>
      </div>
      <div className="border-t border-[var(--store-footer-line)] px-4 py-5 pb-20 text-center sm:pb-5"><Copyright /></div>
    </footer>
  );
}

export function StoreFooter() {
  const pick = typeof window === "undefined" ? "a" : new URLSearchParams(window.location.search).get("footer") ?? "a";
  if (pick === "b") return <FooterBanner />;
  if (pick === "c") return <FooterCentered />;
  return <FooterColumns />;
}
