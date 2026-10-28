import { Link } from "@tanstack/react-router";
import { useSiteImage } from "@/lib/site-images";
import { Clock, Gem, Headphones, Home, Receipt, ShieldCheck, Zap } from "lucide-react";
import { games, store } from "@/lib/games";
import { useStorePrefs } from "@/lib/storePrefs";

const telegramUrl = `https://t.me/${store.telegram.replace("@", "")}`;
const popular = ["mlbb", "ff", "pubg", "hok", "roblox"].map((id) =>
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
      <span className="grid h-8 w-8 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_6px_18px_rgb(47_95_224/0.45)]">
        <Gem className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
      </span>
      <span className="font-display text-base font-black tracking-wide text-on-dark sm:text-xl">
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
      className="store-footer-chip px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm hover:border-brand-400 hover:text-brand-400"
    >
      <TelegramIcon size={15} />
      Telegram
    </a>
  );
}

function Copyright() {
  const { t } = useStorePrefs();
  return (
    <p className="text-[11px] text-on-dark-muted sm:text-xs">
      © 2026 {store.name}. {t("All rights reserved.")}
    </p>
  );
}

/* Four columns: brand, menu, popular games, help card. Khmer labels use Koulen (font-khmer),
   kept at 15px+ with tall line height so vowel marks don't clip. */
export function StoreFooter() {
  const { t } = useStorePrefs();
  const pic = useSiteImage();
  const head =
    "mb-1.5 font-khmer text-[14px] sm:mb-3 sm:text-lg font-normal leading-[1.9] tracking-wide text-on-dark";
  const link =
    "flex items-center gap-2 text-xs sm:text-sm text-on-dark-muted transition-colors hover:text-brand-400";
  const khLink = `${link} font-khmer text-[13px] sm:text-[15px] leading-[1.9] tracking-wide`;
  return (
    <footer id="help" className="store-footer mt-6 sm:mt-10">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 gap-x-4 gap-y-6 px-4 py-7 sm:gap-x-6 sm:gap-y-10 sm:px-6 sm:py-12 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="col-span-2 flex flex-col items-center border-b border-[var(--store-footer-line)] pb-6 text-center sm:block sm:border-0 sm:pb-0 sm:text-left lg:col-span-1">
          <Brand />
          <p className="mt-2 max-w-xs font-khmer text-[13px] sm:mt-4 sm:text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
            {t("Fast and safe game top-ups in Cambodia.")}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-5 sm:justify-start sm:gap-2">
            {[
              { Icon: Zap, label: "1-5 min" },
              { Icon: ShieldCheck, label: "Safe payment" },
              { Icon: Clock, label: store.hours },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className="store-footer-chip font-khmer text-[12px] leading-[1.9] tracking-wide sm:text-[14px]"
              >
                <Icon className="h-3 w-3 text-brand-400 sm:h-3.5 sm:w-3.5" />
                {t(label)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className={head}>{t("Menu")}</h3>
          <ul className="space-y-1.5 sm:space-y-3">
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
          <ul className="space-y-2 sm:space-y-2.5">
            {popular.map((g) => (
              <li key={g.id}>
                <Link to="/game/$gameId" params={{ gameId: g.id }} className={link}>
                  <img
                    src={pic(g.icon)}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="h-5 w-5 rounded-md object-cover sm:h-6 sm:w-6"
                  />
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="store-footer-card col-span-2 p-4 sm:p-5 lg:col-span-1">
          <h3 className="font-khmer text-[15px] sm:text-xl font-normal leading-[1.9] tracking-wide text-on-dark">
            {t("Need help?")}
          </h3>
          <p className="mt-0.5 font-khmer text-[13px] sm:mt-1 sm:text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
            {t("Message us, we reply 24 hours.")}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 sm:mt-0 sm:block">
            <div className="sm:mt-4">
              <TelegramButton />
            </div>
            <div className="flex items-center gap-2 sm:mt-5 sm:block sm:border-t sm:border-[var(--store-footer-line)] sm:pt-4">
              <p className="font-khmer text-[13px] sm:mb-2 sm:text-[15px] leading-[1.9] tracking-wide text-on-dark-muted">
                {t("We accept")}
              </p>
              <KhqrBadge />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--store-footer-line)]">
        <div className="mx-auto flex w-full max-w-[1500px] flex-row items-center justify-between gap-2 px-4 py-3 pb-20 sm:py-5 sm:px-6 sm:pb-5 sm:pr-24">
          <Copyright />
          <p className="font-khmer text-[13px] leading-[1.9] tracking-wide text-on-dark-muted sm:text-[15px]">
            {t("Made in Cambodia")}
          </p>
        </div>
      </div>
    </footer>
  );
}
