import { useEffect, useState } from "react";
import { EyeOff, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { games, serverGames } from "@/lib/games";
import { setStoreStatus, type StoreStatus } from "@/lib/store-status";
import { useAdminT } from "@/components/admin/i18n";

// The owner's sales switch: hide every package in the shop at once, or only
// some games. Saved in public.store_settings; package prices are not touched,
// so switching sales back on shows exactly what was on sale before.
export function AdminSales() {
  const { t } = useAdminT();
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("store_settings")
      .select("sales_open, hidden_games")
      .eq("id", 1)
      .maybeSingle();
    setMissing(!!error);
    setStatus(
      data
        ? { salesOpen: data.sales_open, hiddenGames: data.hidden_games ?? [] }
        : { salesOpen: true, hiddenGames: [] },
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function save(next: StoreStatus) {
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("store_settings").upsert({
      id: 1,
      sales_open: next.salesOpen,
      hidden_games: next.hiddenGames,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setErr(error.message);
    } else {
      setStatus(next);
      setStoreStatus(next);
    }
    setSaving(false);
  }

  if (missing) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {t("The sales switch needs store_settings.sql run in Supabase first.")}
      </div>
    );
  }
  if (!status) return null;

  const open = status.salesOpen;
  const toggleGame = (id: string) =>
    save({
      ...status,
      hiddenGames: status.hiddenGames.includes(id)
        ? status.hiddenGames.filter((g) => g !== id)
        : [...status.hiddenGames, id],
    });

  return (
    <div className="vx-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {open ? <Store className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-semibold">
              {open ? t("Sales are open") : t("All sales are hidden")}
            </p>
            <p className="text-xs text-gray-500">
              {open
                ? t("Customers can see packages and order")
                : t("Customers see Coming soon and cannot order. Paid orders are still delivered.")}
            </p>
          </div>
        </div>
        <button
          disabled={saving}
          onClick={() => save({ ...status, salesOpen: !open })}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 ${
            open ? "bg-red-600 hover:bg-red-700" : "bg-[#28C76F] hover:bg-green-600"
          }`}
        >
          {saving ? t("Saving…") : open ? t("Hide all packages") : t("Open sales")}
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-500">
          {t("Hide one game only (tap to switch)")}
        </p>
        <div className="flex flex-wrap gap-2">
          {[...games, ...serverGames].map((g) => {
            const hidden = status.hiddenGames.includes(g.id);
            const shown = open && !hidden;
            return (
              <button
                key={g.id}
                disabled={saving}
                onClick={() => toggleGame(g.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  shown
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-gray-300 bg-gray-100 text-gray-500 line-through"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
