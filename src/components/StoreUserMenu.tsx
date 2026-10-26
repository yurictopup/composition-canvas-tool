import { useEffect, useState, type ReactNode } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Check,
  Clock,
  Languages,
  LayoutDashboard,
  LogOut,
  MailOpen,
  Monitor,
  Moon,
  Receipt,
  RotateCcw,
  Sun,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isOwner } from "@/lib/games";
import { setStoreLang, setStoreTheme, useStorePrefs, type StoreLang, type StoreTheme } from "@/lib/storePrefs";

// Store header controls: language and theme for everyone, plus order
// notifications and the account menu once signed in (same pattern as the
// admin top bar).

type OrderNote = {
  id: string;
  game_name: string;
  package_amt: string;
  price_usd: number;
  status: string;
  created_at: string;
};

const SEEN_KEY = "yt-store-notifications-seen";

const STATUS: Record<string, { title: string; icon: ReactNode; color: string }> = {
  pending: { title: "Waiting for payment", icon: <Clock size={18} />, color: "#FF9F43" },
  processing: { title: "Paid, delivering now", icon: <Truck size={18} />, color: "#64A9F3" },
  completed: { title: "Delivered", icon: <CheckCircle2 size={18} />, color: "#28C76F" },
  failed: { title: "Delivery failed, contact support", icon: <AlertTriangle size={18} />, color: "#FF4C51" },
  refunded: { title: "Refunded", icon: <RotateCcw size={18} />, color: "#B8CDE5" },
};

function timeAgo(iso: string, km: boolean) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return km ? "ឥឡូវនេះ" : "just now";
  if (mins < 60) return km ? `${mins} នាទីមុន` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return km ? `${hours} ម៉ោងមុន` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return km ? `${days} ថ្ងៃមុន` : `${days} day${days > 1 ? "s" : ""} ago`;
}

const iconBtn =
  "store-icon-btn relative flex h-9 w-9 items-center justify-center rounded-full text-on-dark-muted outline-none transition-colors";
const pop = "store-pop z-50 rounded-lg";
const itemCls =
  "flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm text-on-dark outline-none";

export function StoreSettingsMenu() {
  const { lang, theme, light, t } = useStorePrefs();
  const themes: { id: StoreTheme; label: string; icon: ReactNode }[] = [
    { id: "light", label: t("Light"), icon: <Sun size={18} /> },
    { id: "dark", label: t("Dark"), icon: <Moon size={18} /> },
    { id: "system", label: t("System"), icon: <Monitor size={18} /> },
  ];
  const langs: [StoreLang, string][] = [
    ["km", "ខ្មែរ"],
    ["en", "English"],
  ];
  return (
    <>
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={t("Language")}>
          <Languages size={20} />
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={8} data-light={light} className={`${pop} min-w-40 p-1.5`}>
            {langs.map(([id, label]) => (
              <DM.Item key={id} onSelect={() => setStoreLang(id)} className={`${itemCls} ${lang === id ? "store-pop-active" : ""}`}>
                <span className="flex-1">{label}</span>
                {lang === id && <Check size={16} />}
              </DM.Item>
            ))}
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={t("Theme")}>
          {theme === "light" ? <Sun size={20} /> : theme === "system" ? <Monitor size={20} /> : <Moon size={20} />}
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={8} data-light={light} className={`${pop} min-w-40 p-1.5`}>
            {themes.map((th) => (
              <DM.Item key={th.id} onSelect={() => setStoreTheme(th.id)} className={`${itemCls} ${theme === th.id ? "store-pop-active" : ""}`}>
                {th.icon}
                {th.label}
              </DM.Item>
            ))}
          </DM.Content>
        </DM.Portal>
      </DM.Root>
    </>
  );
}

export function StoreUserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const owner = isOwner(user.email);
  const { lang, light, t } = useStorePrefs();
  const km = lang === "km";
  const [orders, setOrders] = useState<OrderNote[]>([]);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    try {
      setSeen(Number(localStorage.getItem(SEEN_KEY) ?? 0) || 0);
    } catch {
      // private mode: everything shows as new
    }
    supabase
      .from("orders")
      .select("id, game_name, package_amt, price_usd, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setOrders((data as OrderNote[] | null) ?? []));
  }, [user.id]);

  function markAllRead() {
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // private mode: the badge just resets on reload
    }
  }

  const unread = orders.filter((o) => new Date(o.created_at).getTime() > seen).length;
  const initials = (user.email ?? "?").slice(0, 2);

  return (
    <div className="flex items-center gap-1">
      {/* Order notifications */}
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={t("Notifications")}>
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--store-dot-ring,var(--brand-950))] bg-[#FF4C51]" />
          )}
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={8} data-light={light} className={`${pop} w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-[color:var(--store-line,rgb(100_169_243/0.2))] px-5 py-3.5">
              <span className="flex-1 text-sm font-semibold">{t("Notification")}</span>
              {unread > 0 && (
                <span className="rounded bg-brand-400/20 px-2 py-0.5 text-xs font-semibold text-brand-400">{unread} {t("New")}</span>
              )}
              <button onClick={markAllRead} title={t("Mark all as read")} className="text-on-dark-muted hover:text-on-dark">
                <MailOpen size={18} />
              </button>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {orders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-on-dark-muted">{t("No orders yet")}</p>
              ) : (
                orders.map((o) => {
                  const s = STATUS[o.status] ?? STATUS["pending"]!;
                  const isNew = new Date(o.created_at).getTime() > seen;
                  return (
                    <DM.Item key={o.id} asChild>
                      <Link
                        to={owner ? "/admin" : "/profile"}
                        className="flex gap-3 border-b border-[color:var(--store-line,rgb(100_169_243/0.2))] px-5 py-3.5 outline-none last:border-0 "
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                          style={{ color: s.color, background: `${s.color}26` }}
                        >
                          {s.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{t(s.title)}</span>
                          <span className="block truncate text-xs text-on-dark-muted">
                            {o.game_name} · {o.package_amt} · ${Number(o.price_usd).toFixed(2)}
                          </span>
                          <span className="mt-1 block text-[11px] text-on-dark-muted/80">{timeAgo(o.created_at, km)}</span>
                        </span>
                        {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
                      </Link>
                    </DM.Item>
                  );
                })
              )}
            </div>
            <div className="border-t border-[color:var(--store-line,rgb(100_169_243/0.2))] p-3">
              <DM.Item asChild>
                <Link
                  to={owner ? "/admin" : "/profile"}
                  className="btn-3d block rounded-md py-2 text-center text-sm font-semibold outline-none"
                >
                  {t("View all orders")}
                </Link>
              </DM.Item>
            </div>
          </DM.Content>
        </DM.Portal>
      </DM.Root>

      {/* Account */}
      <DM.Root modal={false}>
        <DM.Trigger className="relative ml-1 rounded-full outline-none" title={user.email ?? ""}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold uppercase text-white ring-2 ring-brand-400/40">
            {initials}
          </span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--store-dot-ring,var(--brand-950))] bg-[#28C76F]" />
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={8} data-light={light} className={`${pop} w-64 p-1.5`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold uppercase text-white">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{user.email}</span>
                <span className="block text-xs text-on-dark-muted">{t(owner ? "Owner" : "Customer")}</span>
              </span>
            </div>
            <DM.Separator className="my-1 h-px bg-brand-400/20" />
            {owner && (
              <DM.Item asChild className={itemCls}>
                <Link to="/admin">
                  <LayoutDashboard size={18} />
                  {t("Admin dashboard")}
                </Link>
              </DM.Item>
            )}
            <DM.Item asChild className={itemCls}>
              <Link to="/profile">
                <Receipt size={18} />
                {t("My orders")}
              </Link>
            </DM.Item>
            <DM.Separator className="my-1 h-px bg-brand-400/20" />
            <DM.Item onSelect={onSignOut} className={`${itemCls} !text-[#FF6B6F]`}>
              <LogOut size={18} />
              {t("Sign Out")}
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>
    </div>
  );
}
