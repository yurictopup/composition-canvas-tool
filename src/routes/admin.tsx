import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { isOwner } from "@/lib/games";
import { AdminPrices } from "@/components/AdminPrices";
import { DeliveryCell } from "@/components/AdminDelivery";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Yuric Topup" }] }),
  component: AdminPage,
});

type Order = {
  id: string;
  user_email: string;
  game_name: string;
  package_amt: string;
  price_usd: number;
  player_id: string;
  player_zone: string | null;
  status: string;
  payment: string;
  created_at: string;
  supplier_order_id?: string | null;
  supplier_status?: string | null;
  payment_md5?: string | null;
  paid_at?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800 border-yellow-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300",
  completed:  "bg-green-100 text-green-800 border-green-300",
  failed:     "bg-red-100 text-red-800 border-red-300",
  refunded:   "bg-gray-100 text-gray-600 border-gray-300",
};

type NavItem = {
  id: string;
  icon: string;
  label: string;
};

const NAV: NavItem[] = [
  { id: "overview",    icon: "📊", label: "Overview" },
  { id: "orders",      icon: "📦", label: "Orders" },
  { id: "customers",   icon: "👥", label: "Customers" },
  { id: "cashflow",    icon: "💵", label: "Cash Flow" },
  { id: "prices",      icon: "🏷️", label: "Prices" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("km-KH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "all">("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (isOwner(data.user?.email)) {
        setAllowed(true);
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

  const fo = filteredOrders();
  const revenue     = fo.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.price_usd), 0);
  const grossProfit = revenue; // no cost data yet
  const pendingOrders    = fo.filter(o => o.status === "pending");
  const processingOrders = fo.filter(o => o.status === "processing");
  const completedOrders  = fo.filter(o => o.status === "completed");
  const failedOrders     = fo.filter(o => o.status === "failed");

  // Unique customers
  const uniqueCustomers = [...new Set(fo.map(o => o.user_email))];

  // 7-day chart data
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === key);
    const rev = dayOrders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.price_usd), 0);
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      revenue: rev,
      orders: dayOrders.length,
    };
  });

  const maxRev = Math.max(...days7.map(d => d.revenue), 1);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a1a]">
        <p className="text-white/60">កំពុងពិនិត្យ...</p>
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f8] text-[#1a1a2e]">

      {/* ── Sidebar ── */}
      <aside className="hidden sm:flex w-56 flex-col bg-[#1a0a2e] text-white">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-display text-lg font-black text-white leading-tight">👑 YURIC TOPUP</div>
          <div className="text-[10px] text-white/40 mt-0.5">Owner Control Center</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === n.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Live Status */}
        <div className="border-t border-white/10 px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Live Status</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/80">
              <span>Paid orders</span>
              <span className="font-bold text-green-400">{completedOrders.length}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Pending</span>
              <span className="font-bold text-yellow-400">{pendingOrders.length}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Processing</span>
              <span className="font-bold text-blue-400">{processingOrders.length}</span>
            </div>
          </div>
        </div>

        <div className="px-3 pb-4">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors">
            ← Back to Store
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between bg-white border-b border-black/8 px-5 py-3 shadow-sm">
          <div>
            <h1 className="font-display text-lg font-black">
              {tab === "overview" && "Business Performance"}
              {tab === "orders" && "📦 Orders"}
              {tab === "customers" && "👥 Customers"}
              {tab === "cashflow" && "💵 Cash Flow"}
              {tab === "prices" && "🏷️ Prices"}
            </h1>
            {tab === "overview" && <p className="text-xs text-gray-400 mt-0.5">Executive Overview</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Time filter */}
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as typeof timeFilter)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#1a0a2e]"
            >
              <option value="today">Today</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={loadData}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {loading ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              <p>កំពុងទាញទិន្នន័យ...</p>
            </div>
          ) : (

            <>
              {/* ══════════════ OVERVIEW TAB ══════════════ */}
              {tab === "overview" && (
                <>
                  {/* KPI row */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: "REVENUE",      value: `$${revenue.toFixed(2)}`,      sub: "from paid orders",        dark: false },
                      { label: "ORDER COST",   value: "$0.00",                        sub: "supplier / buy cost",     dark: false },
                      { label: "GROSS PROFIT", value: `$${grossProfit.toFixed(2)}`,   sub: "before refunds & expense", dark: false },
                      { label: "NET PROFIT",   value: `$${grossProfit.toFixed(2)}`,   sub: "after all adjustments",   dark: true  },
                    ].map((k) => (
                      <div key={k.label} className={`rounded-2xl p-5 ${k.dark ? "bg-[#1a0a2e] text-white" : "bg-white border border-black/8"}`}>
                        <div className={`text-[10px] font-bold tracking-widest mb-2 ${k.dark ? "text-white/50" : "text-gray-400"}`}>{k.label}</div>
                        <div className={`font-display text-2xl font-black ${k.dark ? "text-white" : "text-[#1a0a2e]"}`}>{k.value}</div>
                        <div className={`text-xs mt-1 ${k.dark ? "text-white/50" : "text-gray-400"}`}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart + Finance Alerts */}
                  <div className="grid gap-4 sm:grid-cols-5">
                    {/* 7-day chart */}
                    <div className="sm:col-span-3 bg-white rounded-2xl p-5 border border-black/8">
                      <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">7-DAY TREND</div>
                      <div className="font-display text-base font-bold mb-4">Revenue & orders</div>
                      <div className="flex items-end gap-2 h-28">
                        {days7.map((d) => (
                          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col items-center gap-0.5">
                              <div
                                className="w-full rounded-t-md bg-[#c0392b]/20"
                                style={{ height: `${Math.max(4, (d.revenue / maxRev) * 80)}px` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">{d.label}</span>
                            <span className="text-[9px] font-bold text-[#c0392b]">{d.orders > 0 ? d.orders : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-[#c0392b]/20 inline-block"/>Revenue</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-[#1a0a2e]/20 inline-block"/>Orders</span>
                      </div>
                    </div>

                    {/* Finance Alerts */}
                    <div className="sm:col-span-2 bg-white rounded-2xl p-5 border border-black/8">
                      <div className="text-[10px] font-bold tracking-widest text-[#c0392b] mb-1">ATTENTION NEEDED</div>
                      <div className="font-display text-base font-bold mb-4">Finance alerts</div>
                      <div className="space-y-2">
                        {[
                          { label: "Pending payments",    count: pendingOrders.length,    warn: pendingOrders.length > 0 },
                          { label: "Paid not delivered",  count: processingOrders.length, warn: processingOrders.length > 0 },
                          { label: "Failed deliveries",   count: failedOrders.length,     warn: failedOrders.length > 0 },
                          { label: "All orders",          count: fo.length,               warn: false },
                        ].map((a) => (
                          <button
                            key={a.label}
                            onClick={() => setTab("orders")}
                            className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium">{a.label}</span>
                            <span className={`font-bold ${a.warn ? "text-[#c0392b]" : "text-gray-500"}`}>{a.count} &rsaquo;</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: "REFUNDS",       value: "$0.00" },
                      { label: "OTHER INCOME",  value: "$0.00" },
                      { label: "EXPENSE / LOSS",value: "$0.00" },
                      { label: "ALL ORDERS",    value: fo.length },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/8">
                        <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">{s.label}</div>
                        <div className="font-display text-2xl font-black text-[#1a0a2e]">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ══════════════ ORDERS TAB ══════════════ */}
              {tab === "orders" && (
                <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                  {fo.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <div className="text-4xl mb-3">📭</div>
                      <p>មិនទាន់មាន orders ទេ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr className="text-left text-xs text-gray-500">
                            <th className="px-4 py-3 font-semibold">Order ID</th>
                            <th className="px-4 py-3 font-semibold">Customer</th>
                            <th className="px-4 py-3 font-semibold">Game</th>
                            <th className="px-4 py-3 font-semibold">Package</th>
                            <th className="px-4 py-3 font-semibold">Player ID</th>
                            <th className="px-4 py-3 font-semibold">Price</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Update</th>
                            <th className="px-4 py-3 font-semibold">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {fo.map((o) => (
                            <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3 text-xs font-mono text-gray-400">{o.id.slice(0, 8).toUpperCase()}</td>
                              <td className="px-4 py-3 max-w-[130px] truncate text-xs text-gray-500">{o.user_email}</td>
                              <td className="px-4 py-3 font-semibold">{o.game_name}</td>
                              <td className="px-4 py-3 text-sm">{o.package_amt}</td>
                              <td className="px-4 py-3 text-xs font-mono">{o.player_id}{o.player_zone ? ` (${o.player_zone})` : ""}</td>
                              <td className="px-4 py-3 font-bold text-[#1a0a2e]">${Number(o.price_usd).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? ""}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={o.status}
                                  disabled={updatingId === o.id}
                                  onChange={(e) => updateStatus(o.id, e.target.value)}
                                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#1a0a2e]"
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
                <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold">Customers ({uniqueCustomers.length})</span>
                  </div>
                  {uniqueCustomers.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <div className="text-4xl mb-3">👥</div>
                      <p>មិនទាន់មាន customers ទេ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr className="text-left text-xs text-gray-500">
                            <th className="px-4 py-3 font-semibold">Email</th>
                            <th className="px-4 py-3 font-semibold">Total Orders</th>
                            <th className="px-4 py-3 font-semibold">Total Spent</th>
                            <th className="px-4 py-3 font-semibold">Last Order</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {uniqueCustomers.map((email) => {
                            const userOrders = fo.filter(o => o.user_email === email);
                            const spent = userOrders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.price_usd), 0);
                            const last = userOrders[0]?.created_at;
                            return (
                              <tr key={email} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-4 py-3 font-medium">{email}</td>
                                <td className="px-4 py-3">{userOrders.length}</td>
                                <td className="px-4 py-3 font-bold text-[#1a0a2e]">${spent.toFixed(2)}</td>
                                <td className="px-4 py-3 text-xs text-gray-400">{last ? fmtDate(last) : "—"}</td>
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      { label: "Total Revenue",  value: `$${revenue.toFixed(2)}`,       color: "text-green-600" },
                      { label: "Total Expenses", value: "$0.00",                          color: "text-red-500" },
                      { label: "Net Cash Flow",  value: `$${revenue.toFixed(2)}`,       color: "text-[#1a0a2e]" },
                    ].map((c) => (
                      <div key={c.label} className="bg-white rounded-2xl p-5 border border-black/8">
                        <div className="text-xs text-gray-400 mb-2">{c.label}</div>
                        <div className={`font-display text-2xl font-black ${c.color}`}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 font-bold">Completed Transactions</div>
                    {completedOrders.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">មិនទាន់មាន completed orders ទេ</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-left text-xs text-gray-500">
                              <th className="px-4 py-3 font-semibold">Date</th>
                              <th className="px-4 py-3 font-semibold">Customer</th>
                              <th className="px-4 py-3 font-semibold">Game</th>
                              <th className="px-4 py-3 font-semibold">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {completedOrders.map((o) => (
                              <tr key={o.id} className="hover:bg-gray-50/60">
                                <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{o.user_email}</td>
                                <td className="px-4 py-3">{o.game_name} — {o.package_amt}</td>
                                <td className="px-4 py-3 font-bold text-green-600">+${Number(o.price_usd).toFixed(2)}</td>
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
      </div>
    </div>
  );
}
