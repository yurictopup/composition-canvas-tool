import { Link } from "@tanstack/react-router";
import { Clock, Gem, Headphones, Home, Receipt, ShieldCheck, Zap } from "lucide-react";
import { games, store } from "@/lib/games";
import { useStorePrefs } from "@/lib/storePrefs";

const telegramUrl = `https://t.me/${store.telegram.replace("@", "")}`;
const popular = ["mlbb", "ff", "pubg", "hok", "valorant"].map((id) =>
  games.find((g) => g.id === id)!,
);

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.3a1.2 1.2 0 0 0-1.62-1.37L2.83 9.67c-1.1.43-1.08 1.99.03 2.38l4.3 1.5 1.67 5.3c.27.86 1.35 1.13 1.98.5l2.4-2.38 4.47 3.3c.8.6 1.95.16 2.15-.82zM9.4 13.9l8.26-6.1c.3-.22.62.18.36.43l-6.8 6.4-.27 2.9z" />
    </svg>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_6px_18px_rgb(47_95_224/0.45)]">
        <Gem size={20} strokeWidth={2.2} />
      </span>
      <span className="font-display text-xl font-black tracking-wide text-on-dark">
        YURIC<span className="text-brand-400"> TOPUP</span>
      </span>
    </Link>
  );
}

function KhqrBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
      <span className="rounded-[3px] bg-[#E1232E] px-1.5 py-0.5 text-[11px] font-extrabold leading-none tracking-wide text-white">
        KHQR
      </span>
      <span className="text-xs font-semibold text-[#142650]">Bakong</span>
    </span>
  );
}

// Pill link in the footer chip style, as KENZO picked.
function TelegramButton() {
  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="store-footer-chip px-4 py-2 text-sm hover:border-brand-400 hover:text-brand-400"
    >
      <TelegramIcon size={15} />
      Telegram
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

/* Four columns: brand, menu, popular games, help card. Khmer labels use Koulen (font-khmer),
   kept at 15px+ with tall line height so vowel marks don't clip. */
export function StoreFooter() {
  const { t } = useStorePrefs();
  const head = "mb-3 font-khmer text-lg font-normal leading-[1.9] tracking-wide text-on-dark";
  const link =
    "flex items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-brand-400";
  const khLink = `${link} font-khmer text-[15px] leading-[1.9] tracking-wide`;
  return (
    <footer id="help" className="store-footer mt-10">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="col-span-2 lg:col-span-1">
          <Brand />
          <p className="mt-4 max-w-xs font-khmer text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
            {t("Fast and safe game top-ups in Cambodia.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { Icon: Zap, label: "1-5 min" },
              { Icon: ShieldCheck, label: "Safe payment" },
              { Icon: Clock, label: store.hours },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className="store-footer-chip font-khmer text-[14px] leading-[1.9] tracking-wide"
              >
                <Icon size={14} className="text-brand-400" />
                {t(label)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className={head}>{t("Menu")}</h3>
          <ul className="space-y-3">
            <li>
              <Link to="/" className={khLink}>
                <Home size={15} />
                {t("Home")}
              </Link>
            </li>
            <li>
              <Link to="/profile" className={khLink}>
                <Receipt size={15} />
                {t("My orders")}
              </Link>
            </li>
            <li>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={khLink}>
                <Headphones size={15} />
                {t("Support")}
              </a>
            </li>
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
          <h3 className="font-khmer text-xl font-normal leading-[1.9] tracking-wide text-on-dark">
            {t("Need help?")}
          </h3>
          <p className="mt-1 font-khmer text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
            {t("Message us, we reply 24 hours.")}
          </p>
          <div className="mt-4">
            <TelegramButton />
          </div>
          <div className="mt-5 border-t border-[var(--store-footer-line)] pt-4">
            <p className="mb-2 font-khmer text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
              {t("We accept")}
            </p>
            <KhqrBadge />
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--store-footer-line)]">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-2 px-4 py-5 pb-20 sm:flex-row sm:px-6 sm:pb-5 sm:pr-24">
          <Copyright />
          <p className="font-khmer text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
            {t("Made in Cambodia")}
          </p>
        </div>
      </div>
    </footer>
  );
}
