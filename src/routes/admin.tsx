import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { isOwner } from "@/lib/games";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Yuric Topup" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? null;
      setEmail(userEmail);
      if (isOwner(userEmail)) {
        setAllowed(true);
      } else {
        navigate({ to: "/" });
      }
      setChecking(false);
    });
  }, [navigate]);

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black">👑 Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">{email}</p>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to store</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          {[
            { label: "Orders Today", value: "—", icon: "📦" },
            { label: "Revenue Today", value: "—", icon: "💰" },
            { label: "Total Users", value: "—", icon: "👤" },
            { label: "Pending Orders", value: "—", icon: "⏳" },
          ].map((stat) => (
            <div key={stat.label} className="card-3d rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="font-display text-xl font-black">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card-3d rounded-2xl p-5 mb-6">
          <h2 className="font-bold mb-4">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
              📋 View All Orders
            </button>
            <button className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-500/20 transition-colors">
              ✅ Process Pending
            </button>
            <button className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20 transition-colors">
              👥 Manage Users
            </button>
            <button className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors">
              💎 Update Prices
            </button>
          </div>
        </div>

        {/* Recent Orders placeholder */}
        <div className="card-3d rounded-2xl p-5">
          <h2 className="font-bold mb-4">📦 Recent Orders</h2>
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground text-sm">
            <div className="text-3xl mb-2">📭</div>
            Orders system នឹង setup ពេលក្រោយ — Telegram bot integration
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
