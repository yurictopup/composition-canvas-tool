import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/games";
import { StoreGuestMenu, StoreSettingsMenu, StoreUserMenu } from "@/components/StoreUserMenu";
import { useStorePrefs } from "@/lib/storePrefs";
import { ChatWidget } from "@/components/ChatWidget";
import { BadgeDollarSign, Headphones, ShieldCheck, Zap } from "lucide-react";

const tickerItems = [
  { Icon: Zap, label: "Instant delivery in 1-5 minutes", tone: "bg-amber-400 text-amber-950" },
  { Icon: BadgeDollarSign, label: "Best prices", tone: "bg-sky-300 text-sky-950" },
  { Icon: ShieldCheck, label: "Secure payment", tone: "bg-emerald-400 text-emerald-950" },
  { Icon: Headphones, label: "support", tone: "bg-fuchsia-300 text-fuchsia-950" },
];

export function SiteChrome({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { light, t } = useStorePrefs();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className={`page-gradient flex min-h-screen flex-col ${light ? "store-light" : ""}`}>
      <header className="store-header sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-black text-glow">
            💎 YURIC<span className="text-brand-400"> TOPUP</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <StoreSettingsMenu />
            {user ? (
              <StoreUserMenu user={user} onSignOut={signOut} />
            ) : (
              <StoreGuestMenu />
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <div className="ticker-bar relative overflow-hidden rounded-xl border border-brand-400/30 py-2 text-primary-foreground shadow-[0_6px_20px_oklch(0.3_0.15_266/0.35)]">
          <div className="ticker-fade pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
          <div className="marquee-track ticker-track">
            {[0, 1].map((k) => (
              <span key={k} aria-hidden={k === 1} className="flex shrink-0 items-center gap-3 pr-3">
                {/* Each half repeats the list so it is wider than the bar on any screen; no gap appears. */}
                {[...tickerItems, ...tickerItems].map(({ Icon, label, tone }, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-4 font-khmer text-[15px] font-normal leading-[1.9] tracking-wide backdrop-blur-sm">
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${tone}`}>
                        <Icon size={15} strokeWidth={2.5} />
                      </span>
                      {label === "support" ? `${t("Support")} ${store.hours}` : t(label)}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400/70" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer id="help" className="border-t border-brand-400/20 mt-8">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Link to="/" className="font-display text-lg font-black text-glow">
              💎 YURIC<span className="text-brand-400"> TOPUP</span>
            </Link>
            <div className="flex items-center gap-5 text-sm text-on-dark-muted">
              <Link to="/" className="hover:text-on-dark transition-colors">{t("Home")}</Link>
              <Link to="/profile" className="hover:text-on-dark transition-colors">{t("Orders")}</Link>
              <a href={`https://t.me/${store.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-on-dark transition-colors">Telegram</a>
            </div>
            <p className="text-xs text-on-dark-muted">© 2026 {store.name}</p>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
