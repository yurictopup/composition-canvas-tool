import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Circle,
  CircleDot,
  Gem,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isOwnerAccount } from "@/lib/owner";
import { findGame } from "@/lib/games";
import { AdminPrices } from "@/components/AdminPrices";
import { AdminImages } from "@/components/admin/AdminImages";
import { AdminMfa } from "@/components/admin/AdminMfa";
import { AdminSupplierOrders } from "@/components/admin/AdminSupplierOrders";
import { DeliveryCell } from "@/components/AdminDelivery";
import { AdminOverview, money, orderCost, paid } from "@/components/admin/AdminOverview";
import { AdminTopbar, type ThemeChoice } from "@/components/admin/AdminTopbar";
import { AdminLangContext, translate, type Lang } from "@/components/admin/i18n";
import { FAZER_COSTS_DATE } from "@/lib/fazercards-costs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminOrder } from "@/components/admin/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Yuric Topup" }] }),
  component: AdminPage,
});

type Order = AdminOrder;

type NavItem = {
  id: string;
  icon: ReactNode;
  label: string;
  title: string;
  section: string;
};

function loadPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the choice just isn't remembered
  }
}

const NAV: NavItem[] = [
  {
    id: "overview",
    icon: <LayoutDashboard size={22} />,
    label: "Overview",
    title: "Dashboard",
    section: "Dashboard",
  },
  {
    id: "orders",
    icon: <ShoppingCart size={22} />,
    label: "Orders",
    title: "Orders",
    section: "Store",
  },
  {
    id: "customers",
    icon: <Users size={22} />,
    label: "Customers",
    title: "Customers",
    section: "Store",
  },
  {
    id: "cashflow",
    icon: <Wallet size={22} />,
    label: "Cash Flow",
    title: "Cash Flow",
    section: "Store",
  },
  { id: "prices", icon: <Tag size={22} />, label: "Prices", title: "Prices", section: "Store" },
  {
    id: "images",
    icon: <ImageIcon size={22} />,
    label: "Images",
    title: "Images",
    section: "Store",
  },
  {
    id: "supplier",
    icon: <Truck size={22} />,
    label: "FazerCards",
    title: "FazerCards orders",
    section: "Store",
  },
];

// Placeholder cards in the dashboard's own grid while the first orders load.
const SKELETON = ["lg:col-span-12", "lg:col-span-4", "lg:col-span-8", "lg:col-span-6", "lg:col-span-6"];

function GameIcon({ gameId, size = 28 }: { gameId: string; size?: number }) {
  const icon = findGame(gameId)?.icon;
  if (!icon) return null;
  return (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

/** A short two-note chime for a newly paid order; silent when the browser blocks audio. */
function chime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    osc.onended = () => void ctx.close();
  } catch {
    // No audio: the new order still shows in the list.
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  // The 6-digit authenticator code passed (session level aal2).
  const [codeOk, setCodeOk] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "all">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<Lang>("km");
  const [theme, setTheme] = useState<ThemeChoice>("light");
  const [systemDark, setSystemDark] = useState(false);
  // Desktop menu: collapsed to icons, and opens over the page while hovered.
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setLang(loadPref("yt-admin-lang", ["en", "km"] as const, "km"));
    setTheme(loadPref("yt-admin-theme", ["light", "dark", "system"] as const, "light"));
    setCollapsed(loadPref("yt-admin-menu", ["open", "collapsed"] as const, "open") === "collapsed");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const t = (s: string) => translate(lang, s);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  const mini = collapsed && !hovered;

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setHovered(false);
    savePref("yt-admin-menu", next ? "collapsed" : "open");
  }

  useEffect(() => {
    // The user, owner and order requests run together instead of one after another.
    // Orders only show after the 6-digit code; RLS returns all of them only to a
    // session that passed it, and onCodePassed loads them again.
    void loadData();
    Promise.all([supabase.auth.getUser(), isOwnerAccount(supabase)]).then(([{ data }, owner]) => {
      if (data.user && owner) {
        setAllowed(true);
        setOwnerEmail(data.user.email ?? "");
      } else {
        navigate({ to: "/" });
      }
      setChecking(false);
    });
  }, [navigate]);

  // Refresh every minute while the page is open, and chime for orders paid after it opened
  // (earlier ones, including those loaded again after the 6-digit code, stay silent).
  const openedAt = useRef(Date.now());
  const seenPaid = useRef(new Set<string>());
  useEffect(() => {
    if (!codeOk) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [codeOk]);
  useEffect(() => {
    let fresh = false;
    for (const o of orders) {
      if (!paid(o) || seenPaid.current.has(o.id)) continue;
      seenPaid.current.add(o.id);
      if (o.paid_at && new Date(o.paid_at).getTime() > openedAt.current) fresh = true;
    }
    if (fresh) chime();
  }, [orders]);

  const onCodePassed = useCallback(() => {
    setCodeOk(true);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    await loadData();
    setUpdatingId(null);
  }

  // Filter orders by time
  function filteredOrders() {
    const now = new Date();
    return orders.filter((o) => {
      const d = new Date(o.created_at);
      if (timeFilter === "today") return d.toDateString() === now.toDateString();
      if (timeFilter === "7d") return now.getTime() - d.getTime() < 7 * 86400000;
      if (timeFilter === "30d") return now.getTime() - d.getTime() < 30 * 86400000;
      return true;
    });
  }

  function openTab(id: string) {
    setTab(id);
    setMenuOpen(false);
  }

  const fo = filteredOrders();
  const revenue = fo.filter(paid).reduce((s, o) => s + Number(o.price_usd), 0);
  const pendingOrders = fo.filter((o) => o.status === "pending" && !o.paid_at);
  const processingOrders = fo.filter(
    (o) => o.status === "processing" || (o.status === "pending" && !!o.paid_at),
  );
  const completedOrders = fo.filter(paid);
  const supplierCost = completedOrders.reduce((s, o) => s + (orderCost(o) ?? 0), 0);

  // Unique customers
  const uniqueCustomers = [...new Set(fo.map((o) => o.user_email))];

  const q = query.trim().toLowerCase();
  const shownOrders = q
    ? fo.filter((o) =>
        [o.id, o.user_email, o.game_name, o.package_amt, o.player_id, o.status].some((v) =>
          v?.toLowerCase().includes(q),
        ),
      )
    : fo;

  const statusSelect = (o: Order) => (
    <select
      value={o.status}
      disabled={updatingId === o.id}
      onChange={(e) => updateStatus(o.id, e.target.value)}
      className="rounded-md border border-[var(--vx-border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--vx-primary)]"
    >
      <option value="pending">{t("pending")}</option>
      <option value="processing">{t("processing")}</option>
      <option value="completed">{t("completed")}</option>
      <option value="failed">{t("failed")}</option>
      <option value="refunded">{t("refunded")}</option>
    </select>
  );

  const current = NAV.find((n) => n.id === tab) ?? NAV[0]!;
  const ownerName = ownerEmail.split("@")[0] || "Owner";

  if (checking) {
    return (
      <div className="vx flex h-screen items-center justify-center">
        <p>{t("Checking...")}</p>
      </div>
    );
  }
  if (!allowed) return null;
  if (!codeOk) {
    return (
      <AdminLangContext.Provider value={lang}>
        <AdminMfa onPassed={onCodePassed} dark={dark} />
      </AdminLangContext.Provider>
    );
  }

  return (
    <AdminLangContext.Provider value={lang}>
      <div className={`vx ${dark ? "vx-dark" : ""} flex min-h-screen text-[15px]`}>
        {/* ── Mobile overlay ── */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* ── Vertical menu ── */}
        <aside
          data-mini={mini}
          onMouseEnter={() => collapsed && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`group/side fixed inset-y-0 left-0 z-40 vx-side flex w-[260px] flex-col overflow-x-hidden transition-[transform,width] duration-200 lg:translate-x-0 lg:data-[mini=true]:w-[72px] ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between px-6 lg:group-data-[mini=true]/side:px-0 lg:group-data-[mini=true]/side:justify-center">
            <span className="whitespace-nowrap font-display text-lg font-black text-white text-glow">
              <Gem
                size={20}
                className="mr-1.5 inline-block -translate-y-0.5 text-brand-400 lg:group-data-[mini=true]/side:mr-0"
              />
              <span className="lg:group-data-[mini=true]/side:hidden">
                YURIC<span className="text-brand-400"> TOPUP</span>
              </span>
            </span>
            <button
              className="lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <button
              className="hidden text-[var(--vx-muted)] hover:text-white lg:block lg:group-data-[mini=true]/side:hidden"
              onClick={toggleCollapsed}
              title={collapsed ? t("Keep menu open") : t("Collapse menu")}
              aria-label="Toggle menu"
            >
              {collapsed ? <Circle size={18} /> : <CircleDot size={18} />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 lg:group-data-[mini=true]/side:px-3">
            {["Dashboard", "Store"].map((section) => (
              <div key={section}>
                <div className="whitespace-nowrap px-2 pb-2 pt-5 text-[13px] uppercase tracking-wide text-[var(--vx-muted)] lg:group-data-[mini=true]/side:hidden">
                  {t(section)}
                </div>
                <div className="mx-3 my-4 hidden h-px bg-white/15 lg:group-data-[mini=true]/side:block" />
                {NAV.filter((n) => n.section === section).map((n) => {
                  const badge =
                    n.id === "orders" ? pendingOrders.length + processingOrders.length : 0;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openTab(n.id)}
                      title={t(n.label)}
                      className={`relative mb-1 flex w-full items-center gap-3 whitespace-nowrap rounded-md px-4 py-2 text-[15px] transition-colors lg:group-data-[mini=true]/side:justify-center lg:group-data-[mini=true]/side:px-0 ${
                        tab === n.id
                          ? "vx-nav-active"
                          : "text-[var(--vx-muted)] hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {n.icon}
                      <span className="flex-1 text-left lg:group-data-[mini=true]/side:hidden">
                        {t(n.label)}
                      </span>
                      {badge > 0 && (
                        <span className="rounded-full bg-[var(--vx-danger)] px-2 text-xs font-medium leading-5 text-white lg:group-data-[mini=true]/side:hidden">
                          {badge}
                        </span>
                      )}
                      {badge > 0 && (
                        <span className="absolute right-2 top-1.5 hidden h-2 w-2 rounded-full bg-[var(--vx-danger)] lg:group-data-[mini=true]/side:block" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="whitespace-nowrap px-2 pb-2 pt-5 text-[13px] uppercase tracking-wide text-[var(--vx-muted)] lg:group-data-[mini=true]/side:hidden">
              {t("Live status")}
            </div>
            <div className="space-y-2 whitespace-nowrap px-4 text-[13px] lg:group-data-[mini=true]/side:hidden">
              {[
                { label: "Paid orders", value: completedOrders.length, color: "var(--vx-success)" },
                { label: "Pending", value: pendingOrders.length, color: "var(--vx-warning)" },
                { label: "Processing", value: processingOrders.length, color: "var(--vx-info)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1">{t(s.label)}</span>
                  <span className="font-medium text-[var(--vx-heading)]">{s.value}</span>
                </div>
              ))}
            </div>
          </nav>

          <div className="px-4 pb-5 lg:group-data-[mini=true]/side:px-3">
            <Link
              to="/"
              title={t("Back to Store")}
              className="flex items-center gap-3 whitespace-nowrap rounded-md px-4 py-2 text-[15px] text-[var(--vx-muted)] hover:bg-white/10 hover:text-white lg:group-data-[mini=true]/side:justify-center lg:group-data-[mini=true]/side:px-0"
            >
              <ArrowLeft size={20} className="shrink-0" />
              <span className="lg:group-data-[mini=true]/side:hidden">{t("Back to Store")}</span>
            </Link>
          </div>
        </aside>

        {/* ── Main ── */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"}`}
        >
          {/* Navbar (detached) */}
          <div className="sticky top-0 z-20 bg-[var(--vx-bg)]/90 px-4 pt-4 backdrop-blur sm:px-6">
            <header className="vx-card mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
              <button
                className="lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={22} className="text-[var(--vx-heading)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-medium leading-tight">{t(current.title)}</h1>
                <p className="hidden text-[13px] text-[var(--vx-muted)] sm:block">
                  {t("Admin")} / {t(current.label)}
                </p>
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
                className="hidden rounded-md border border-[var(--vx-border)] bg-[var(--vx-card)] px-3 py-1.5 text-[13px] sm:block text-[var(--vx-heading)] outline-none focus:border-[var(--vx-primary)]"
              >
                <option value="today">{t("Today")}</option>
                <option value="7d">{t("7 Days")}</option>
                <option value="30d">{t("30 Days")}</option>
                <option value="all">{t("All time")}</option>
              </select>
              <button
                onClick={loadData}
                title={t("Refresh")}
                className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full text-[var(--vx-heading)] hover:bg-[var(--vx-hover)]"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <AdminTopbar
                orders={orders}
                ownerEmail={ownerEmail}
                lang={lang}
                onLang={(l) => {
                  setLang(l);
                  savePref("yt-admin-lang", l);
                }}
                theme={theme}
                onTheme={(th) => {
                  setTheme(th);
                  savePref("yt-admin-theme", th);
                }}
                onOpenTab={openTab}
                onRefresh={loadData}
              />
            </header>
          </div>

          {/* Content */}
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
            {/* On phones the top bar has no room for the period filter, so it sits here. */}
            <div className="mb-4 flex items-center gap-2 sm:hidden">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
                className="flex-1 rounded-md border border-[var(--vx-border)] bg-[var(--vx-card)] px-3 py-2 text-[13px] text-[var(--vx-heading)] outline-none focus:border-[var(--vx-primary)]"
              >
                <option value="today">{t("Today")}</option>
                <option value="7d">{t("7 Days")}</option>
                <option value="30d">{t("30 Days")}</option>
                <option value="all">{t("All time")}</option>
              </select>
              <button
                onClick={loadData}
                title={t("Refresh")}
                className="vx-card flex h-9 w-9 items-center justify-center text-[var(--vx-heading)]"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {loading && orders.length === 0 ? (
              <div
                className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-12"
                aria-busy="true"
                aria-label={t("Loading...")}
              >
                {SKELETON.map((span, i) => (
                  <div key={i} className={`vx-card space-y-3 p-6 ${span}`}>
                    <div className="vx-skel h-4 w-1/3" />
                    <div className="vx-skel h-8 w-1/2" />
                    <div className="vx-skel h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div key={tab} className="vx-fade">
                {/* ══════════════ OVERVIEW TAB ══════════════ */}
                {tab === "overview" && (
                  <AdminOverview
                    orders={fo}
                    allOrders={orders}
                    ownerName={ownerName}
                    onOpenOrders={() => openTab("orders")}
                  />
                )}

                {/* ══════════════ ORDERS TAB ══════════════ */}
                {tab === "orders" && (
                  <div className="vx-card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-6">
                      <div>
                        <h5 className="text-lg font-medium">{t("Orders")}</h5>
                        <p className="text-[13px] text-[var(--vx-muted)]">
                          {shownOrders.length} {t("orders")}
                        </p>
                      </div>
                      <label className="flex w-full items-center gap-2 rounded-md border border-[var(--vx-border)] px-3 py-1.5 focus-within:border-[var(--vx-primary)] sm:w-auto">
                        <Search size={16} className="text-[var(--vx-muted)]" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t("Search order, email, player ID")}
                          className="w-full bg-transparent text-[13px] outline-none sm:w-56"
                        />
                      </label>
                    </div>
                    {shownOrders.length === 0 ? (
                      <div className="p-12 text-center text-[var(--vx-muted)]">
                        <Inbox size={40} strokeWidth={1.5} className="mx-auto mb-3" />
                        <p>{t("No orders yet")}</p>
                      </div>
                    ) : (
                      <>
                      {/* Phones get one card per order instead of the wide table. */}
                      <ul className="divide-y divide-[var(--vx-border)] border-t border-[var(--vx-border)] md:hidden">
                        {shownOrders.map((o) => (
                          <li key={o.id} className="space-y-2 p-4">
                            <div className="flex items-start gap-3">
                              <GameIcon gameId={o.game_id} size={44} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-[var(--vx-heading)]">
                                  {o.game_name}
                                </p>
                                <p className="text-[13px]">{o.package_amt}</p>
                              </div>
                              <p className="font-semibold text-[var(--vx-heading)]">
                                {money(Number(o.price_usd))}
                              </p>
                            </div>
                            <p className="break-all font-mono text-xs">
                              {o.player_id}
                              {o.player_zone ? ` (${o.player_zone})` : ""}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--vx-muted)]">
                              <StatusBadge status={o.status} />
                              <span>{fmtDate(o.created_at)}</span>
                              <span className="min-w-0 truncate">{o.user_email}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {statusSelect(o)}
                              <DeliveryCell order={o} onChanged={loadData} />
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="vx-table w-full text-sm">
                          <thead className="border-y border-[var(--vx-border)]">
                            <tr className="text-left">
                              <th className="px-4 py-3">{t("Order ID")}</th>
                              <th className="px-4 py-3">{t("Customer")}</th>
                              <th className="px-4 py-3">{t("Game")}</th>
                              <th className="px-4 py-3">{t("Package")}</th>
                              <th className="px-4 py-3">{t("Player ID")}</th>
                              <th className="px-4 py-3">{t("Price")}</th>
                              <th className="px-4 py-3">{t("Status")}</th>
                              <th className="px-4 py-3">{t("Date")}</th>
                              <th className="px-4 py-3">{t("Update")}</th>
                              <th className="px-4 py-3">{t("Delivery")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--vx-border)]">
                            {shownOrders.map((o) => (
                              <tr
                                key={o.id}
                                className="transition-colors hover:bg-[var(--vx-hover)]"
                              >
                                <td className="px-4 py-3 text-xs font-medium text-[var(--vx-primary)]">
                                  #{o.id.slice(0, 8).toUpperCase()}
                                </td>
                                <td className="px-4 py-3 max-w-[160px] truncate text-xs">
                                  {o.user_email}
                                </td>
                                <td className="px-4 py-3 font-medium text-[var(--vx-heading)]">
                                  <span className="flex items-center gap-2">
                                    <GameIcon gameId={o.game_id} />
                                    {o.game_name}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{o.package_amt}</td>
                                <td className="px-4 py-3 text-xs font-mono">
                                  {o.player_id}
                                  {o.player_zone ? ` (${o.player_zone})` : ""}
                                </td>
                                <td className="px-4 py-3 font-medium text-[var(--vx-heading)]">
                                  {money(Number(o.price_usd))}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={o.status} />
                                </td>
                                <td className="px-4 py-3 text-xs text-[var(--vx-muted)]">
                                  {fmtDate(o.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                  {statusSelect(o)}
                                </td>
                                <td className="px-4 py-3">
                                  <DeliveryCell order={o} onChanged={loadData} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </>
                    )}
                  </div>
                )}

                {/* ══════════════ CUSTOMERS TAB ══════════════ */}
                {tab === "customers" && (
                  <div className="vx-card overflow-hidden">
                    <div className="p-6">
                      <h5 className="text-lg font-medium">{t("Customers")}</h5>
                      <p className="text-[13px] text-[var(--vx-muted)]">
                        {uniqueCustomers.length} {t("customers")}
                      </p>
                    </div>
                    {uniqueCustomers.length === 0 ? (
                      <div className="p-12 text-center text-[var(--vx-muted)]">
                        <Users size={40} strokeWidth={1.5} className="mx-auto mb-3" />
                        <p>{t("No customers yet")}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="vx-table w-full text-sm">
                          <thead className="border-y border-[var(--vx-border)]">
                            <tr className="text-left">
                              <th className="px-6 py-3">{t("Customer")}</th>
                              <th className="px-6 py-3">{t("Total Orders")}</th>
                              <th className="px-6 py-3">{t("Total Spent")}</th>
                              <th className="px-6 py-3">{t("Last Order")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--vx-border)]">
                            {uniqueCustomers.map((email) => {
                              const userOrders = fo.filter((o) => o.user_email === email);
                              const spent = userOrders
                                .filter(paid)
                                .reduce((s, o) => s + Number(o.price_usd), 0);
                              const last = userOrders[0]?.created_at;
                              return (
                                <tr
                                  key={email}
                                  className="transition-colors hover:bg-[var(--vx-hover)]"
                                >
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--vx-primary-soft)] text-xs font-semibold uppercase text-[var(--vx-primary)]">
                                        {email.slice(0, 2)}
                                      </span>
                                      <span className="font-medium text-[var(--vx-heading)]">
                                        {email}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">{userOrders.length}</td>
                                  <td className="px-6 py-3 font-medium text-[var(--vx-heading)]">
                                    {money(spent)}
                                  </td>
                                  <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">
                                    {last ? fmtDate(last) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ CASH FLOW TAB ══════════════ */}
                {tab === "cashflow" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      {[
                        {
                          label: "Total Revenue",
                          value: money(revenue),
                          color: "var(--vx-success)",
                          icon: <Wallet size={22} />,
                        },
                        {
                          label: "Supplier cost",
                          value: money(supplierCost),
                          color: "var(--vx-danger)",
                          icon: <Tag size={22} />,
                        },
                        {
                          label: "Net profit",
                          value: money(revenue - supplierCost),
                          color: "var(--vx-primary)",
                          icon: <LayoutDashboard size={22} />,
                        },
                      ].map((c) => (
                        <div key={c.label} className="vx-card flex items-center gap-4 p-6">
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-md"
                            style={{
                              color: c.color,
                              background: `color-mix(in srgb, ${c.color} 16%, transparent)`,
                            }}
                          >
                            {c.icon}
                          </span>
                          <div>
                            <div className="text-2xl font-medium text-[var(--vx-heading)]">
                              {c.value}
                            </div>
                            <div className="text-[13px]">{t(c.label)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[13px] text-[var(--vx-muted)]">
                      {t("Cost is an estimate from FazerCards prices on")} {FAZER_COSTS_DATE}{" "}
                      {t("Manual packages (Roblox, FF bundle) have no cost here.")}
                    </p>

                    <div className="vx-card overflow-hidden">
                      <div className="p-6">
                        <h5 className="text-lg font-medium">{t("Paid Transactions")}</h5>
                      </div>
                      {completedOrders.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[var(--vx-muted)]">
                          {t("No paid orders yet")}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="vx-table w-full text-sm">
                            <thead className="border-y border-[var(--vx-border)]">
                              <tr className="text-left">
                                <th className="px-6 py-3">{t("Date")}</th>
                                <th className="px-6 py-3">{t("Customer")}</th>
                                <th className="px-6 py-3">{t("Game")}</th>
                                <th className="px-6 py-3">{t("Amount")}</th>
                                <th className="px-6 py-3">{t("Cost")}</th>
                                <th className="px-6 py-3">{t("Profit")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--vx-border)]">
                              {completedOrders.map((o) => {
                                const cost = orderCost(o);
                                return (
                                  <tr key={o.id} className="hover:bg-[var(--vx-hover)]">
                                    <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">
                                      {fmtDate(o.created_at)}
                                    </td>
                                    <td className="px-6 py-3 text-xs">{o.user_email}</td>
                                    <td className="px-6 py-3">
                                      {o.game_name} — {o.package_amt}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-[var(--vx-success)]">
                                      +{money(Number(o.price_usd))}
                                    </td>
                                    <td className="px-6 py-3 text-[var(--vx-danger)]">
                                      {cost === null ? t("Manual") : `-${money(cost)}`}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-[var(--vx-heading)]">
                                      {cost === null ? "—" : money(Number(o.price_usd) - cost)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══════════════ PRICES TAB ══════════════ */}
                {tab === "prices" && <AdminPrices />}
                {tab === "images" && <AdminImages />}
                {tab === "supplier" && <AdminSupplierOrders orders={orders} />}
              </div>
            )}
          </main>

          <footer className="mx-auto w-full max-w-[1440px] px-6 pb-6 text-[13px] text-[var(--vx-muted)]">
            © {new Date().getFullYear()} Yuric Topup · {t("Owner Control Center")}
          </footer>
        </div>
      </div>
    </AdminLangContext.Provider>
  );
}
