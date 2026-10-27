import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/games";
import { StoreGuestMenu, StoreSettingsMenu, StoreUserMenu } from "@/components/StoreUserMenu";
import { useStorePrefs } from "@/lib/storePrefs";
import { ChatWidget } from "@/components/ChatWidget";
import { StoreFooter } from "@/components/StoreFooter";
import { BadgeDollarSign, Gem, Headphones, ShieldCheck, Zap } from "lucide-react";

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
    <div className={`store-chrome page-gradient flex min-h-screen flex-col ${light ? "store-light" : ""}`}>
      <header className="store-header sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-3 py-2 sm:px-6 sm:py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-black text-glow sm:text-xl">
            <Gem className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400" aria-hidden="true" />
            YURIC<span className="text-brand-400"> TOPUP</span>
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

      <div className="mx-auto w-full max-w-[1500px] px-3 pt-2 sm:px-6 sm:pt-4">
        <div className="ticker-bar relative overflow-hidden rounded-lg border border-brand-400/30 py-0.5 sm:rounded-xl sm:py-2 text-primary-foreground shadow-[0_6px_20px_oklch(0.3_0.15_266/0.35)]">
          <div className="ticker-fade pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
          <div className="marquee-track ticker-track">
            {[0, 1].map((k) => (
              <span key={k} aria-hidden={k === 1} className="flex shrink-0 items-center gap-2 pr-2 sm:gap-3 sm:pr-3">
                {/* Each half repeats the list so it is wider than the bar on any screen; no gap appears. */}
                {[...tickerItems, ...tickerItems].map(({ Icon, label, tone }, i) => (
                  <span key={i} className="flex items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 py-0 pl-0.5 pr-2.5 font-khmer text-[12px] font-normal leading-[1.9] sm:gap-2 sm:py-1 sm:pl-1 sm:pr-4 sm:text-[15px] tracking-wide backdrop-blur-sm">
                      <span className={`grid h-[18px] w-[18px] place-items-center rounded-full sm:h-7 sm:w-7 ${tone}`}>
                        <Icon className="h-2.5 w-2.5 sm:h-[15px] sm:w-[15px]" strokeWidth={2.5} />
                      </span>
                      {label === "support" ? `${t("Support")} ${store.hours}` : t(label)}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-brand-400/70 sm:h-1.5 sm:w-1.5" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">{children}</div>

      <StoreFooter />

      <ChatWidget />
    </div>
  );
}
