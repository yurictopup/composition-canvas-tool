import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { store, games } from "@/lib/games";
import { ChatWidget } from "@/components/ChatWidget";

export function SiteChrome({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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
    <div className="page-gradient flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-400/20 bg-brand-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-black text-glow">
            💎 YURIC<span className="text-brand-400"> TOPUP</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <span className="hidden max-w-[180px] truncate text-on-dark-muted sm:inline">{user.email}</span>
                <button
                  onClick={signOut}
                  className="rounded-lg border border-brand-400/40 px-4 py-1.5 font-semibold text-on-dark-muted transition-colors hover:text-on-dark"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-4 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <div className="overflow-hidden rounded-lg border border-brand-400/25 bg-primary py-2 text-sm font-semibold text-primary-foreground">
          <div className="marquee-track">
            {[0, 1].map((k) => (
              <span key={k} className="flex shrink-0 items-center gap-10 pr-10">
                <span>⚡ Instant delivery in 1-3 minutes</span>
                <span>💎 Best prices</span>
                <span>🔒 Secure payment</span>
                <span>🎧 Support {store.hours}</span>
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
              <Link to="/" className="hover:text-on-dark transition-colors">Home</Link>
              <Link to="/profile" className="hover:text-on-dark transition-colors">Orders</Link>
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
