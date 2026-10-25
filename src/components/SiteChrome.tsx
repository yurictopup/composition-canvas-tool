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

      <footer id="help" className="border-t border-brand-400/20 bg-brand-950/80 mt-8 text-sm text-on-dark-muted">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

            {/* Brand */}
            <div>
              <div className="font-display text-xl font-black text-glow mb-2">
                💎 YURIC<span className="text-brand-400"> TOPUP</span>
              </div>
              <p className="text-xs text-on-dark-muted leading-relaxed mb-3">
                ផ្គត់ផ្គង់ diamond លឿន · ថ្លៃថោក · មាន 24 ម៉ោង
              </p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> 24/7 Customer Support</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> Instant Delivery</li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-on-dark mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="hover:text-on-dark transition-colors">Home</Link></li>
                <li><Link to="/profile" className="hover:text-on-dark transition-colors">Transaction History</Link></li>
                <li><a href={`https://t.me/${store.telegram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-on-dark transition-colors">Track Order</a></li>
              </ul>
            </div>

            {/* Categories + Follow Us */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-on-dark mb-3">Categories</h3>
                <ul className="space-y-2">
                  <li><Link to="/" hash="games" className="hover:text-on-dark transition-colors">Hot 🔥</Link></li>
                  {games.slice(0, 6).map((g) => (
                    <li key={g.id}>
                      <Link to="/game/$gameId" params={{ gameId: g.id }} className="hover:text-on-dark transition-colors">
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-on-dark mb-3">Follow Us</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-on-dark transition-colors">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-800 text-base">f</span>
                      Facebook
                    </a>
                  </li>
                  <li>
                    <a href={`https://t.me/${store.telegram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-on-dark transition-colors">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-800 text-base">✈</span>
                      Telegram
                    </a>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          <div className="mt-8 border-t border-brand-400/20 pt-5 text-center text-xs text-on-dark-muted">
            © 2026 {store.name} · All rights reserved
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
