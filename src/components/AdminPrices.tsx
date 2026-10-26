import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { games, getPackages, mlbbHotItems } from "@/lib/games";
import { fetchPrices, packageKey, type PriceMap } from "@/lib/prices";

// Owner-only price editor. Each row is one package from games.ts; saving
// writes it to product_prices, which the database charges and the shop shows.
type Row = { gameId: string; gameName: string; key: string; fallback: number | null };

function allRows(): Row[] {
  return games.flatMap((g) => {
    const hot = g.id === "mlbb" ? mlbbHotItems.map((h) => ({ amt: h.label, price: h.price })) : [];
    return [...hot, ...getPackages(g.id)].map((p) => ({
      gameId: g.id,
      gameName: g.name,
      key: packageKey(p.amt, g.unit),
      fallback: p.price,
    }));
  });
}

export function AdminPrices() {
  const rows = allRows();
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState(games[0]!.id);

  async function load() {
    const map = await fetchPrices();
    setLoadErr(!map);
    setPrices(map);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(row: Row, active: boolean) {
    const id = `${row.gameId}|${row.key}`;
    const current = prices?.get(id);
    const text =
      drafts[id] ?? (current ? current.price_usd.toFixed(2) : (row.fallback?.toFixed(2) ?? ""));
    const price = Number(text);
    if (!Number.isFinite(price) || price <= 0) {
      setMsg(`⚠️ ${row.key}: enter a price above $0.`);
      return;
    }
    setSaving(id);
    setMsg(null);
    const { error } = await supabase.from("product_prices").upsert({
      game_id: row.gameId,
      package_amt: row.key,
      game_name: row.gameName,
      price_usd: Math.round(price * 100) / 100,
      active,
    });
    if (error) {
      setMsg(`⚠️ ${row.key}: ${error.message}`);
    } else {
      setMsg(`✅ ${row.gameName} — ${row.key}: $${price.toFixed(2)}${active ? "" : " (hidden)"}`);
      setDrafts(({ [id]: _, ...rest }) => rest);
      await load();
    }
    setSaving(null);
  }

  const shown = rows.filter((r) => r.gameId === gameFilter);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-black/8 text-sm text-gray-600">
        These are the prices customers see and pay. A saved price takes effect for new orders right
        away. Switch a package off to hide it from sale.
      </div>

      {loadErr && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't read the price table. Make sure the product_prices table exists in Supabase.
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">{msg}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {games
          .filter((g) => getPackages(g.id).length > 0)
          .map((g) => (
            <button
              key={g.id}
              onClick={() => setGameFilter(g.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                gameFilter === g.id
                  ? "border-[#1a0a2e] bg-[#1a0a2e] text-white"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              {g.name}
            </button>
          ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Price (USD)</th>
                <th className="px-4 py-3 font-semibold">On sale</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map((row) => {
                const id = `${row.gameId}|${row.key}`;
                const current = prices?.get(id);
                const active = current?.active ?? false;
                const value = drafts[id] ?? (current ? current.price_usd.toFixed(2) : "");
                return (
                  <tr key={id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold">{row.key}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={value}
                          placeholder={row.fallback?.toFixed(2) ?? "0.00"}
                          onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-[#1a0a2e]"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={saving === id || !prices}
                        onClick={() => save(row, !active)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? "border-green-300 bg-green-100 text-green-800"
                            : "border-gray-300 bg-gray-100 text-gray-600"
                        }`}
                      >
                        {active ? "On" : current ? "Off" : "Not listed"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={saving === id || !prices || drafts[id] === undefined}
                        onClick={() => save(row, current ? active : true)}
                        className="rounded-lg bg-[#1a0a2e] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
                      >
                        {saving === id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
