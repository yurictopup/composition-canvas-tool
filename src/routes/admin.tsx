import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { isOwner } from "@/lib/games";

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
};

type Stats = {
  ordersToday: number;
  revenueToday: number;
  totalUsers: number;
  pendingOrders: number;
};

const STATUS_COLOR: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-300",
  processing: "bg-blue-100 text-blue-700 border-blue-300",
  completed:  "bg-green-100 text-green-700 border-green-300",
  failed:     "bg-red-100 text-red-700 border-red-300",
  refunded:   "bg-gray-100 text-gray-600 border-gray-300",
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ ordersToday: 0, revenueToday: 0, totalUsers: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    // Load orders
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (orderData) {
      setOrders(orderData as Order[]);

      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = orderData.filter((o) => o.created_at.startsWith(today));
      const pending = orderData.filter((o) => o.status === "pending");
      const revenue = todayOrders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + Number(o.price_usd), 0);

      setStats({
        ordersToday: todayOrders.length,
        revenueToday: revenue,
        totalUsers: 0,
        pendingOrders: pending.length,
      });
    }

    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    await loadData();
    setUpdatingId(null);
  }

  if (checking) {
    return (
      <SiteChrome>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">កំពុងពិនិត្យ...</p>
        </main>
      </SiteChrome>
    );
  }
  if (!allowed) return null;

  return (
    <SiteChrome>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black">👑 Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Yuric Topup — Owner Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-muted transition-colors">
              🔄 Refresh
            </button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Store</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          {[
            { label: "Orders Today", value: loading ? "…" : stats.ordersToday, icon: "📦" },
            { label: "Revenue Today", value: loading ? "…" : `$${stats.revenueToday.toFixed(2)}`, icon: "💰" },
            { label: "Pending", value: loading ? "…" : stats.pendingOrders, icon: "⏳", alert: stats.pendingOrders > 0 },
            { label: "Total Orders", value: loading ? "…" : orders.length, icon: "📊" },
          ].map((s) => (
            <div key={s.label} className={`card-3d rounded-2xl p-4 text-center ${(s as any).alert ? "border border-yellow-400/60 bg-yellow-50/30" : ""}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-display text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Orders Table */}
        <div className="card-3d rounded-2xl p-5">
          <h2 className="font-bold mb-4">📦 Orders</h2>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">កំពុងទាញទិន្នន័យ...</p>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground text-sm">
              <div className="text-3xl mb-2">📭</div>
              មិនទាន់មាន orders ទេ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-semibold">User</th>
                    <th className="pb-2 pr-4 font-semibold">Game</th>
                    <th className="pb-2 pr-4 font-semibold">Package</th>
                    <th className="pb-2 pr-4 font-semibold">Player ID</th>
                    <th className="pb-2 pr-4 font-semibold">Price</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 max-w-[140px] truncate text-xs text-muted-foreground">{o.user_email}</td>
                      <td className="py-3 pr-4 font-semibold">{o.game_name}</td>
                      <td className="py-3 pr-4">{o.package_amt}</td>
                      <td className="py-3 pr-4 text-xs font-mono">{o.player_id}{o.player_zone ? ` (${o.player_zone})` : ""}</td>
                      <td className="py-3 pr-4 font-bold text-primary">${Number(o.price_usd).toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? ""}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          value={o.status}
                          disabled={updatingId === o.id}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="rounded-lg border bg-input px-2 py-1 text-xs outline-none focus:border-primary"
                        >
                          <option value="pending">pending</option>
                          <option value="processing">processing</option>
                          <option value="completed">completed</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </SiteChrome>
  );
}
