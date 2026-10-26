import { useEffect, useState, type ReactNode } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Languages,
  LayoutGrid,
  LogOut,
  MailOpen,
  Monitor,
  Moon,
  RefreshCw,
  ShoppingCart,
  Store,
  Sun,
  Tag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminOrder } from "./types";

export type ThemeChoice = "light" | "dark" | "system";
export type Lang = "en" | "km";

const SEEN_KEY = "yt-admin-notifications-seen";

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function timeAgo(iso: string, lang: Lang) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return lang === "km" ? "ឥឡូវនេះ" : "just now";
  if (mins < 60) return lang === "km" ? `${mins} នាទីមុន` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === "km" ? `${hours} ម៉ោងមុន` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return lang === "km" ? `${days} ថ្ងៃមុន` : `${days} day${days > 1 ? "s" : ""} ago`;
}

const iconBtn =
  "relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--vx-heading)] outline-none hover:bg-[var(--vx-hover)] data-[state=open]:bg-[var(--vx-hover)]";
const itemCls =
  "flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-[15px] text-[var(--vx-heading)] outline-none data-[highlighted]:bg-[var(--vx-hover)]";

function Pop({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Not portalled, so the popover stays inside `.vx` and picks up the theme colors.
  return (
    <DM.Content align="end" sideOffset={8} className={`vx-pop z-50 ${className}`}>
      {children}
    </DM.Content>
  );
}

export function AdminTopbar({
  orders,
  ownerEmail,
  lang,
  onLang,
  theme,
  onTheme,
  onOpenTab,
  onRefresh,
}: {
  orders: AdminOrder[];
  ownerEmail: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: ThemeChoice;
  onTheme: (t: ThemeChoice) => void;
  onOpenTab: (tab: string) => void;
  onRefresh: () => void;
}) {
  const km = lang === "km";
  const [seen, setSeen] = useState(0);
  useEffect(() => setSeen(readSeen()), []);

  function markAllRead() {
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // private mode: the badge just resets on reload
    }
  }

  // Orders that need the owner, newest first, plus the latest paid ones.
  const notes = orders
    .filter((o) => ["pending", "processing", "failed", "completed"].includes(o.status))
    .slice(0, 8)
    .map((o) => {
      const amount = `$${Number(o.price_usd).toFixed(2)}`;
      const what = `${o.game_name} · ${o.package_amt}`;
      const n = {
        pending: { icon: <Clock size={18} />, color: "#FF9F43", title: km ? "រង់ចាំការបង់ប្រាក់" : "Waiting for payment" },
        processing: { icon: <Truck size={18} />, color: "#2F5FE0", title: km ? "បានបង់ ត្រូវបញ្ជូន" : "Paid, needs delivery" },
        failed: { icon: <AlertTriangle size={18} />, color: "#FF4C51", title: km ? "បញ្ជូនមិនបាន" : "Delivery failed" },
        completed: { icon: <ShoppingCart size={18} />, color: "#28C76F", title: km ? "ការកម្មង់ថ្មី" : "New paid order" },
      }[o.status as "pending" | "processing" | "failed" | "completed"];
      return { ...n, id: o.id, text: `${what} — ${amount}`, at: o.created_at, unread: new Date(o.created_at).getTime() > seen };
    });
  const unread = notes.filter((n) => n.unread).length;

  const shortcuts = [
    { label: km ? "ការកម្មង់" : "Orders", sub: km ? "គ្រប់គ្រង" : "Manage orders", icon: <ShoppingCart size={20} />, run: () => onOpenTab("orders") },
    { label: km ? "អតិថិជន" : "Customers", sub: km ? "បញ្ជី" : "Customer list", icon: <Users size={20} />, run: () => onOpenTab("customers") },
    { label: km ? "លំហូរសាច់ប្រាក់" : "Cash Flow", sub: km ? "ចំណូល" : "Money in", icon: <Wallet size={20} />, run: () => onOpenTab("cashflow") },
    { label: km ? "តម្លៃ" : "Prices", sub: km ? "កែតម្លៃ" : "Edit prices", icon: <Tag size={20} />, run: () => onOpenTab("prices") },
    { label: km ? "ហាង" : "Store", sub: km ? "បើកហាង" : "Open the shop", icon: <Store size={20} />, href: "/" },
    { label: km ? "ផ្ទុកឡើងវិញ" : "Refresh", sub: km ? "ទិន្នន័យថ្មី" : "Reload data", icon: <RefreshCw size={20} />, run: onRefresh },
  ];

  const themes: { id: ThemeChoice; label: string; icon: ReactNode }[] = [
    { id: "light", label: km ? "ភ្លឺ" : "Light", icon: <Sun size={18} /> },
    { id: "dark", label: km ? "ងងឹត" : "Dark", icon: <Moon size={18} /> },
    { id: "system", label: km ? "តាមប្រព័ន្ធ" : "System", icon: <Monitor size={18} /> },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const ownerName = ownerEmail.split("@")[0] || "Owner";

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {/* Language */}
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={km ? "ភាសា" : "Language"}>
          <Languages size={20} />
        </DM.Trigger>
        <Pop className="min-w-40 p-1.5">
          {([["en", "English"], ["km", "ខ្មែរ"]] as const).map(([id, label]) => (
            <DM.Item key={id} onSelect={() => onLang(id)} className={`${itemCls} ${lang === id ? "bg-[var(--vx-primary-soft)] !text-[var(--vx-primary)]" : ""}`}>
              <span className="flex-1">{label}</span>
              {lang === id && <Check size={16} />}
            </DM.Item>
          ))}
        </Pop>
      </DM.Root>

      {/* Theme */}
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={km ? "ពន្លឺ" : "Theme"}>
          {theme === "dark" ? <Moon size={20} /> : theme === "system" ? <Monitor size={20} /> : <Sun size={20} />}
        </DM.Trigger>
        <Pop className="min-w-40 p-1.5">
          {themes.map((t) => (
            <DM.Item key={t.id} onSelect={() => onTheme(t.id)} className={`${itemCls} ${theme === t.id ? "bg-[var(--vx-primary-soft)] !text-[var(--vx-primary)]" : ""}`}>
              {t.icon}
              {t.label}
            </DM.Item>
          ))}
        </Pop>
      </DM.Root>

      {/* Shortcuts */}
      <DM.Root modal={false}>
        <DM.Trigger className={`${iconBtn} hidden sm:flex`} title={km ? "ផ្លូវកាត់" : "Shortcuts"}>
          <LayoutGrid size={20} />
        </DM.Trigger>
        <Pop className="w-80 overflow-hidden">
          <div className="border-b border-[var(--vx-border)] px-5 py-3.5 text-[15px] font-medium text-[var(--vx-heading)]">
            {km ? "ផ្លូវកាត់" : "Shortcuts"}
          </div>
          <div className="grid grid-cols-2">
            {shortcuts.map((s, i) => {
              const body = (
                <>
                  <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--vx-hover)] text-[var(--vx-heading)]">
                    {s.icon}
                  </span>
                  <span className="text-[15px] font-medium text-[var(--vx-heading)]">{s.label}</span>
                  <span className="text-[13px] text-[var(--vx-muted)]">{s.sub}</span>
                </>
              );
              const cls = `flex cursor-pointer flex-col items-center px-3 py-5 text-center outline-none data-[highlighted]:bg-[var(--vx-hover)] border-[var(--vx-border)] ${i % 2 === 0 ? "border-r" : ""} ${i < 4 ? "border-b" : ""}`;
              return s.href ? (
                <DM.Item key={s.label} asChild className={cls}>
                  <Link to="/">{body}</Link>
                </DM.Item>
              ) : (
                <DM.Item key={s.label} onSelect={s.run} className={cls}>
                  {body}
                </DM.Item>
              );
            })}
          </div>
        </Pop>
      </DM.Root>

      {/* Notifications */}
      <DM.Root modal={false}>
        <DM.Trigger className={iconBtn} title={km ? "ការជូនដំណឹង" : "Notifications"}>
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--vx-card)] bg-[var(--vx-danger)]" />
          )}
        </DM.Trigger>
        <Pop className="w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--vx-border)] px-5 py-3.5">
            <span className="flex-1 text-[15px] font-medium text-[var(--vx-heading)]">{km ? "ការជូនដំណឹង" : "Notification"}</span>
            {unread > 0 && (
              <span className="rounded bg-[var(--vx-primary-soft)] px-2 py-0.5 text-[13px] font-medium text-[var(--vx-primary)]">
                {unread} {km ? "ថ្មី" : "New"}
              </span>
            )}
            <button onClick={markAllRead} title={km ? "សម្គាល់ថាបានអានទាំងអស់" : "Mark all as read"} className="text-[var(--vx-heading)] hover:text-[var(--vx-primary)]">
              <MailOpen size={18} />
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notes.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-[var(--vx-muted)]">
                {km ? "មិនទាន់មានការជូនដំណឹងទេ" : "No notifications yet"}
              </p>
            ) : (
              notes.map((n) => (
                <DM.Item
                  key={n.id}
                  onSelect={() => onOpenTab("orders")}
                  className="flex cursor-pointer gap-3 border-b border-[var(--vx-border)] px-5 py-3.5 outline-none last:border-0 data-[highlighted]:bg-[var(--vx-hover)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ color: n.color, background: `${n.color}29` }}>
                    {n.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-[var(--vx-heading)]">{n.title}</span>
                    <span className="block truncate text-[13px]">{n.text}</span>
                    <span className="mt-1 block text-[12px] text-[var(--vx-muted)]">{timeAgo(n.at, lang)}</span>
                  </span>
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--vx-primary)]" />}
                </DM.Item>
              ))
            )}
          </div>
          <div className="border-t border-[var(--vx-border)] p-4">
            <DM.Item onSelect={() => onOpenTab("orders")} className="vx-btn block cursor-pointer py-2 text-center text-[14px] font-medium outline-none">
              {km ? "មើលការកម្មង់ទាំងអស់" : "View all notifications"}
            </DM.Item>
          </div>
        </Pop>
      </DM.Root>

      {/* Owner */}
      <DM.Root modal={false}>
        <DM.Trigger className="relative ml-1 rounded-full outline-none" title={ownerEmail}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vx-primary)] text-sm font-semibold uppercase text-white">
            {ownerName.slice(0, 2)}
          </span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--vx-card)] bg-[var(--vx-success)]" />
        </DM.Trigger>
        <Pop className="w-60 p-1.5">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vx-primary)] text-sm font-semibold uppercase text-white">
              {ownerName.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium text-[var(--vx-heading)]">{ownerName}</span>
              <span className="block truncate text-[13px] text-[var(--vx-muted)]">{km ? "ម្ចាស់ហាង" : "Owner"}</span>
            </span>
          </div>
          <DM.Separator className="my-1 h-px bg-[var(--vx-border)]" />
          <DM.Item asChild className={itemCls}>
            <Link to="/">
              <Store size={18} />
              {km ? "ត្រឡប់ទៅហាង" : "Back to Store"}
            </Link>
          </DM.Item>
          <DM.Item onSelect={signOut} className={`${itemCls} !text-[var(--vx-danger)]`}>
            <LogOut size={18} />
            {km ? "ចាកចេញ" : "Log out"}
          </DM.Item>
        </Pop>
      </DM.Root>
    </div>
  );
}
