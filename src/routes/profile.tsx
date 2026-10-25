import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import banner from "@/assets/banner-angkor.png";
import { games, store } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Orders — Yuric Topup" },
      { name: "description", content: "View your Yuric Topup orders." },
      { property: "og:title", content: "My Orders — Yuric Topup" },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: Profile,
});

const STATUS_COLOR: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-300",
  processing: "bg-blue-100 text-blue-700 border-blue-300",
  completed:  "bg-green-100 text-green-700 border-green-300",
  failed:     "bg-red-100 text-red-700 border-red-300",
  refunded:   "bg-gray-100 text-gray-600 border-gray-300",
};

type Order = {
  id: string;
  game_name: string;
  package_amt: string;
  price_usd: number;
  player_id: string;
  player_zone: string | null;
  status: string;
  payment: string;
  created_at: string;
};

function Profile() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setUserEmail(data.user.email ?? null);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setOrders((orderData as Order[]) ?? []);
      setLoading(false);
    });
  }, [navigate]);

  return (
    <SiteChrome>
      <section className="w-full">
        <div className="tile-clean">
          <img src={banner} alt="Shop banner" width={1920} height={1080}
            className="block h-[150px] w-full object-cover sm:h-[210px]" />
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6">
        {/* Profile header */}
        <div className="card-3d relative -mt-12 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-end">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-card bg-secondary font-display text-3xl font-black text-secondary-foreground shadow-lg">
            YT
          </span>
          <div className="min-w-0 pb-1 flex-1">
            <h1 className="font-display text-2xl font-black">{store.name}</h1>
            <p className="text-sm text-muted-foreground">
              {userEmail ?? "Loading…"} · Support {store.hours}
            </p>
          </div>
        </div>

        {/* My Orders */}
        <section className="card-3d mt-5 rounded-3xl p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold mb-4">📦 My Orders</h2>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground text-sm">
              <div className="text-3xl mb-2">📭</div>
              <p>មិនទាន់មាន orders ទេ</p>
              <Link to="/" className="mt-3 inline-block text-primary font-semibold hover:underline">
                ← ទៅ Top Up ឥឡូវ
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-semibold">Game</th>
                    <th className="pb-2 pr-4 font-semibold">Package</th>
                    <th className="pb-2 pr-4 font-semibold">Player ID</th>
                    <th className="pb-2 pr-4 font-semibold">Price</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-semibold">{o.game_name}</td>
                      <td className="py-3 pr-4">{o.package_amt}</td>
                      <td className="py-3 pr-4 text-xs font-mono">{o.player_id}{o.player_zone ? ` (${o.player_zone})` : ""}</td>
                      <td className="py-3 pr-4 font-bold text-primary">${Number(o.price_usd).toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? ""}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("km-KH", { day: "2-digit", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* All Games */}
        <section className="card-3d mt-5 rounded-3xl p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold">🎮 All Games</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap a game to top up.</p>
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6 sm:gap-5">
            {games.map((g, i) => (
              <Link key={g.id} to="/game/$gameId" params={{ gameId: g.id }}
                className="block text-center" style={{ "--shine-delay": `${i * 0.5}s` } as CSSProperties}>
                <span className="tile-clean block rounded-[26%]">
                  <img src={g.icon} alt={g.name} width={151} height={151} className="block aspect-square w-full object-cover" />
                </span>
                <span className="mt-2 block truncate text-[11px] font-semibold">{g.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
