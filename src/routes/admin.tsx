import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isOwner } from "@/lib/games";
import { AdminPrices } from "@/components/AdminPrices";
import { DeliveryCell } from "@/components/AdminDelivery";
import { AdminOverview, money } from "@/components/admin/AdminOverview";
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

const NAV: NavItem[] = [
  { id: "overview",  icon: <LayoutDashboard size={22} />, label: "Overview",  title: "Dashboard", section: "Dashboard" },
  { id: "orders",    icon: <ShoppingCart size={22} />,    label: "Orders",    title: "Orders",    section: "Store" },
  { id: "customers", icon: <Users size={22} />,           label: "Customers", title: "Customers", section: "Store" },
  { id: "cashflow",  icon: <Wallet size={22} />,          label: "Cash Flow", title: "Cash Flow", section: "Store" },
  { id: "prices",    icon: <Tag size={22} />,             label: "Prices",    title: "Prices",    section: "Store" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("km-KH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "all">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (isOwner(data.user?.email)) {
        setAllowed(true);
        setOwnerEmail(data.user?.email ?? "");
        loadData();
      } else {
        navigate({ to: "/" });
      }
      setChecking(false);
    });
  }, [navigate]);

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
      if (timeFilter === "7d") return (now.getTime() - d.getTime()) < 7 * 86400000;
      if (timeFilter === "30d") return (now.getTime() - d.getTime()) < 30 * 86400000;
      return true;
    });
  }

  function openTab(id: string) {
    setTab(id);
    setMenuOpen(false);
  }

  const fo = filteredOrders();
  const revenue = fo.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.price_usd), 0);
  const pendingOrders    = fo.filter(o => o.status === "pending");
  const processingOrders = fo.filter(o => o.status === "processing");
  const completedOrders  = fo.filter(o => o.status === "completed");

  // Unique customers
  const uniqueCustomers = [...new Set(fo.map(o => o.user_email))];

  const q = query.trim().toLowerCase();
  const shownOrders = q
    ? fo.filter((o) =>
        [o.id, o.user_email, o.game_name, o.package_amt, o.player_id, o.status].some((v) =>
          v?.toLowerCase().includes(q),
        ),
      )
    : fo;

  const current = NAV.find((n) => n.id === tab) ?? NAV[0]!;
  const ownerName = ownerEmail.split("@")[0] || "Owner";

  if (checking) {
    return (
      <div className="vx flex h-screen items-center justify-center">
        <p>កំពុងពិនិត្យ...</p>
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <div className="vx flex min-h-screen text-[15px]">

      {/* ── Mobile overlay ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Vertical menu ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 vx-side flex w-[260px] flex-col transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-black text-white text-glow">
              💎 YURIC<span className="text-brand-400"> TOPUP</span>
            </span>
          </div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          {["Dashboard", "Store"].map((section) => (
            <div key={section}>
              <div className="px-2 pb-2 pt-5 text-[13px] uppercase tracking-wide text-[var(--vx-muted)]">{section}</div>
              {NAV.filter((n) => n.section === section).map((n) => {
                const badge = n.id === "orders" ? pendingOrders.length + processingOrders.length : 0;
                return (
                  <button
                    key={n.id}
                    onClick={() => openTab(n.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-md px-4 py-2 text-[15px] transition-colors ${
                      tab === n.id ? "vx-nav-active" : "text-[var(--vx-muted)] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {n.icon}
                    <span className="flex-1 text-left">{n.label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-[var(--vx-danger)] px-2 text-xs font-medium leading-5 text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="px-2 pb-2 pt-5 text-[13px] uppercase tracking-wide text-[var(--vx-muted)]">Live status</div>
          <div className="space-y-2 px-4 text-[13px]">
            {[
              { label: "Paid orders", value: completedOrders.length, color: "var(--vx-success)" },
              { label: "Pending",     value: pendingOrders.length,   color: "var(--vx-warning)" },
              { label: "Processing",  value: processingOrders.length, color: "var(--vx-info)" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="flex-1">{s.label}</span>
                <span className="font-medium text-[var(--vx-heading)]">{s.value}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="px-4 pb-5">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-md px-4 py-2 text-[15px] text-[var(--vx-muted)] hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={20} />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px]">

        {/* Navbar (detached) */}
        <div className="sticky top-0 z-20 bg-[var(--vx-bg)]/90 px-4 pt-4 backdrop-blur sm:px-6">
          <header className="vx-card mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} className="text-[var(--vx-heading)]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-medium leading-tight">{current.title}</h1>
              <p className="hidden text-[13px] text-[var(--vx-muted)] sm:block">
                Admin / {current.label}
              </p>
            </div>
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as typeof timeFilter)}
              className="rounded-md border border-[var(--vx-border)] bg-white px-3 py-1.5 text-[13px] text-[var(--vx-heading)] outline-none focus:border-[var(--vx-primary)]"
            >
              <option value="today">Today</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={loadData}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--vx-heading)] hover:bg-[var(--vx-hover)]"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="relative" title={ownerEmail}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--vx-primary-soft)] text-sm font-semibold uppercase text-[var(--vx-primary)]">
                {ownerName.slice(0, 2)}
              </span>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--vx-success)]" />
            </div>
          </header>
        </div>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">

          {loading && orders.length === 0 ? (
            <div className="vx-card flex h-48 items-center justify-center">
              <p>កំពុងទាញទិន្នន័យ...</p>
            </div>
          ) : (

            <>
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
                      <h5 className="text-lg font-medium">Orders</h5>
                      <p className="text-[13px] text-[var(--vx-muted)]">{shownOrders.length} orders</p>
                    </div>
                    <label className="flex items-center gap-2 rounded-md border border-[var(--vx-border)] px-3 py-1.5 focus-within:border-[var(--vx-primary)]">
                      <Search size={16} className="text-[var(--vx-muted)]" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search order, email, player ID"
                        className="w-56 bg-transparent text-[13px] outline-none"
                      />
                    </label>
                  </div>
                  {shownOrders.length === 0 ? (
                    <div className="p-12 text-center text-[var(--vx-muted)]">
                      <div className="text-4xl mb-3">📭</div>
                      <p>មិនទាន់មាន orders ទេ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="vx-table w-full text-sm">
                        <thead className="border-y border-[var(--vx-border)]">
                          <tr className="text-left">
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Game</th>
                            <th className="px-4 py-3">Package</th>
                            <th className="px-4 py-3">Player ID</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Update</th>
                            <th className="px-4 py-3">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--vx-border)]">
                          {shownOrders.map((o) => (
                            <tr key={o.id} className="transition-colors hover:bg-[var(--vx-hover)]">
                              <td className="px-4 py-3 text-xs font-medium text-[var(--vx-primary)]">#{o.id.slice(0, 8).toUpperCase()}</td>
                              <td className="px-4 py-3 max-w-[160px] truncate text-xs">{o.user_email}</td>
                              <td className="px-4 py-3 font-medium text-[var(--vx-heading)]">{o.game_name}</td>
                              <td className="px-4 py-3 text-sm">{o.package_amt}</td>
                              <td className="px-4 py-3 text-xs font-mono">{o.player_id}{o.player_zone ? ` (${o.player_zone})` : ""}</td>
                              <td className="px-4 py-3 font-medium text-[var(--vx-heading)]">{money(Number(o.price_usd))}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={o.status} />
                              </td>
                              <td className="px-4 py-3 text-xs text-[var(--vx-muted)]">{fmtDate(o.created_at)}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={o.status}
                                  disabled={updatingId === o.id}
                                  onChange={(e) => updateStatus(o.id, e.target.value)}
                                  className="rounded-md border border-[var(--vx-border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--vx-primary)]"
                                >
                                  <option value="pending">pending</option>
                                  <option value="processing">processing</option>
                                  <option value="completed">completed</option>
                                  <option value="failed">failed</option>
                                  <option value="refunded">refunded</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <DeliveryCell order={o} onChanged={loadData} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════ CUSTOMERS TAB ══════════════ */}
              {tab === "customers" && (
                <div className="vx-card overflow-hidden">
                  <div className="p-6">
                    <h5 className="text-lg font-medium">Customers</h5>
                    <p className="text-[13px] text-[var(--vx-muted)]">{uniqueCustomers.length} customers</p>
                  </div>
                  {uniqueCustomers.length === 0 ? (
                    <div className="p-12 text-center text-[var(--vx-muted)]">
                      <div className="text-4xl mb-3">👥</div>
                      <p>មិនទាន់មាន customers ទេ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="vx-table w-full text-sm">
                        <thead className="border-y border-[var(--vx-border)]">
                          <tr className="text-left">
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Total Orders</th>
                            <th className="px-6 py-3">Total Spent</th>
                            <th className="px-6 py-3">Last Order</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--vx-border)]">
                          {uniqueCustomers.map((email) => {
                            const userOrders = fo.filter(o => o.user_email === email);
                            const spent = userOrders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.price_usd), 0);
                            const last = userOrders[0]?.created_at;
                            return (
                              <tr key={email} className="transition-colors hover:bg-[var(--vx-hover)]">
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--vx-primary-soft)] text-xs font-semibold uppercase text-[var(--vx-primary)]">
                                      {email.slice(0, 2)}
                                    </span>
                                    <span className="font-medium text-[var(--vx-heading)]">{email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3">{userOrders.length}</td>
                                <td className="px-6 py-3 font-medium text-[var(--vx-heading)]">{money(spent)}</td>
                                <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">{last ? fmtDate(last) : "—"}</td>
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
                      { label: "Total Revenue",  value: money(revenue), color: "var(--vx-success)", icon: <Wallet size={22} /> },
                      { label: "Total Expenses", value: "$0.00",        color: "var(--vx-danger)",  icon: <Tag size={22} /> },
                      { label: "Net Cash Flow",  value: money(revenue), color: "var(--vx-primary)", icon: <LayoutDashboard size={22} /> },
                    ].map((c) => (
                      <div key={c.label} className="vx-card flex items-center gap-4 p-6">
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-md"
                          style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 16%, transparent)` }}
                        >
                          {c.icon}
                        </span>
                        <div>
                          <div className="text-2xl font-medium text-[var(--vx-heading)]">{c.value}</div>
                          <div className="text-[13px]">{c.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="vx-card overflow-hidden">
                    <div className="p-6">
                      <h5 className="text-lg font-medium">Completed Transactions</h5>
                    </div>
                    {completedOrders.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[var(--vx-muted)]">មិនទាន់មាន completed orders ទេ</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="vx-table w-full text-sm">
                          <thead className="border-y border-[var(--vx-border)]">
                            <tr className="text-left">
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Customer</th>
                              <th className="px-6 py-3">Game</th>
                              <th className="px-6 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--vx-border)]">
                            {completedOrders.map((o) => (
                              <tr key={o.id} className="hover:bg-[var(--vx-hover)]">
                                <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">{fmtDate(o.created_at)}</td>
                                <td className="px-6 py-3 text-xs">{o.user_email}</td>
                                <td className="px-6 py-3">{o.game_name} — {o.package_amt}</td>
                                <td className="px-6 py-3 font-medium text-[var(--vx-success)]">+{money(Number(o.price_usd))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════ PRICES TAB ══════════════ */}
              {tab === "prices" && <AdminPrices />}
            </>
          )}
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-6 pb-6 text-[13px] text-[var(--vx-muted)]">
          © {new Date().getFullYear()} Yuric Topup · Owner Control Center
        </footer>
      </div>
    </div>
  );
}
