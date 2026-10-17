import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { store } from "@/lib/games";

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="page-gradient flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-brand-400/20 bg-brand-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-black text-glow">
            💎 YURIC<span className="text-brand-400"> TOPUP</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-on-dark-muted">
            <Link to="/" hash="games" className="transition-colors hover:text-on-dark">ហ្គេម</Link>
            <Link to="/profile" className="transition-colors hover:text-on-dark">ប្រវត្តិ</Link>
          </nav>
        </div>
      </header>

      <div className="overflow-hidden border-y border-brand-400/25 bg-primary py-2 text-sm font-semibold text-primary-foreground">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0 items-center gap-10 pr-10">
              <span>⚡ បញ្ចូលពេជ្រក្នុង 1-3 នាទី</span>
              <span>💎 តម្លៃថោកបំផុត</span>
              <span>🔒 បង់ប្រាក់សុវត្ថិភាព</span>
              <span>🎧 ជំនួយ {store.hours}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer id="help" className="border-t border-brand-100/50 py-6 text-center text-sm text-muted-foreground">
        © 2026 {store.name} · Telegram: {store.telegram}
      </footer>
    </div>
  );
}
