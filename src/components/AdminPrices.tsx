import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { games, getHotItems, getPackages, serverGames } from "@/lib/games";
import { fetchPrices, packageKey, packageSize, type PriceMap } from "@/lib/prices";
import { fazerCosts, fazerOffers } from "@/lib/fazercards-costs";
import { fazerCatalog } from "@/lib/fazercards-catalog";
import { useAdminT } from "@/components/admin/i18n";

// Owner-only price editor. Each row is one package from games.ts; saving
// writes it to product_prices, which the database charges and the shop shows.
type Row = {
  gameId: string;
  gameName: string;
  key: string;
  fallback: number | null;
  added?: boolean;
};

function allRows(): Row[] {
  return [...games, ...serverGames].flatMap((g) => {
    const hot = getHotItems(g.id).map((h) => ({ amt: h.label, price: h.price }));
    return [...hot, ...getPackages(g.id)].map((p) => ({
      gameId: g.id,
      gameName: g.name,
      key: packageKey(p.amt, g.unit),
      fallback: p.price,
    }));
  });
}

export function AdminPrices() {
  const { t } = useAdminT();
  const builtIn = allRows();
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState(games[0]!.id);
  const [newAmt, setNewAmt] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOffer, setNewOffer] = useState("");

  async function load() {
    const map = await fetchPrices();
    setLoadErr(!map);
    setPrices(map);
  }

  useEffect(() => {
    load();
  }, []);

  const allGames = [...games, ...serverGames];
  const game = allGames.find((g) => g.id === gameFilter)!;
  const offers = fazerOffers[gameFilter] ?? [];
  const offerCost = (name: string | null | undefined) => offers.find((o) => o.name === name)?.cost;
  // FazerCards product a package is bought as: the owner's pick, else the built-in list.
  const offerOf = (key: string) =>
    prices?.get(`${gameFilter}|${key}`)?.fazer_offer || fazerCatalog[gameFilter]?.offers[key] || "";

  // Packages the owner added here (not in the built-in list) show up as rows too.
  const known = new Set(builtIn.filter((r) => r.gameId === gameFilter).map((r) => r.key));
  const added: Row[] = [...(prices?.values() ?? [])]
    .filter((p) => p.game_id === gameFilter && !known.has(p.package_amt))
    .map((p) => ({
      gameId: p.game_id,
      gameName: p.game_name,
      key: p.package_amt,
      fallback: p.price_usd,
      added: true,
    }));
  const rows = [...builtIn, ...added];

  async function setOffer(row: Row, offer: string) {
    const id = `${row.gameId}|${row.key}`;
    const current = prices?.get(id);
    setSaving(id);
    setMsg(null);
    const { error } = await supabase.from("product_prices").upsert({
      game_id: row.gameId,
      package_amt: row.key,
      game_name: row.gameName,
      price_usd: current?.price_usd ?? row.fallback ?? 0,
      active: current?.active ?? false,
      fazer_offer: offer || null,
    });
    setMsg(error ? `${row.key}: ${error.message}` : `${row.key}: ${offer || t("Manual")}`);
    if (!error) await load();
    setSaving(null);
  }

  async function addPackage() {
    const amt = newAmt.trim().replace(/\s+/g, " ");
    const price = Number(newPrice);
    if (!/^\d+( \+ \d+)?$/.test(amt.replace(/\s*\+\s*/, " + "))) {
      setMsg(t("Amount is a number, like 86 or 78 + 8"));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setMsg(t("enter a price above $0"));
      return;
    }
    const key = packageKey(amt.replace(/\s*\+\s*/, " + "), game.unit);
    setSaving("new");
    setMsg(null);
    const { error } = await supabase.from("product_prices").upsert({
      game_id: game.id,
      package_amt: key,
      game_name: game.name,
      price_usd: Math.round(price * 100) / 100,
      active: true,
      fazer_offer: newOffer || null,
    });
    if (error) {
      setMsg(`${key}: ${error.message}`);
    } else {
      setMsg(`${t("Added")}: ${game.name} — ${key} $${price.toFixed(2)}`);
      setNewAmt("");
      setNewPrice("");
      setNewOffer("");
      await load();
    }
    setSaving(null);
  }

  async function save(row: Row, active: boolean) {
    const id = `${row.gameId}|${row.key}`;
    const current = prices?.get(id);
    const text =
      drafts[id] ?? (current ? current.price_usd.toFixed(2) : (row.fallback?.toFixed(2) ?? ""));
    const price = Number(text);
    if (!Number.isFinite(price) || price <= 0) {
      setMsg(`${row.key}: ${t("enter a price above $0")}`);
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
      fazer_offer: current?.fazer_offer ?? null,
    });
    if (error) {
      setMsg(`${row.key}: ${error.message}`);
    } else {
      setMsg(
        `${row.gameName} — ${row.key}: $${price.toFixed(2)}${active ? "" : ` (${t("hidden")})`}`,
      );
      setDrafts(({ [id]: _, ...rest }) => rest);
      await load();
    }
    setSaving(null);
  }

  const shown = rows
    .filter((r) => r.gameId === gameFilter)
    .sort((a, b) => packageSize(a.key) - packageSize(b.key));

  return (
    <div className="space-y-4">
      <div className="vx-card p-5 text-sm text-gray-600">
        {t(
          "These are the prices customers see and pay. A saved price works for new orders right away. Switch a package off to hide it from sale.",
        )}
      </div>

      {loadErr && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t(
            "Couldn't read the price table. Make sure the product_prices table exists in Supabase.",
          )}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">{msg}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[...games, ...serverGames]
          .filter((g) => getPackages(g.id).length > 0)
          .map((g) => (
            <button
              key={g.id}
              onClick={() => setGameFilter(g.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                gameFilter === g.id
                  ? "border-[#1C3CB2] bg-[#1C3CB2] text-white"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              {g.name}
            </button>
          ))}
      </div>

      <div className="vx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="vx-table w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">{t("Package")}</th>
                <th className="px-4 py-3 font-semibold">{t("Price (USD)")}</th>
                <th className="px-4 py-3 font-semibold">{t("FazerCards product")}</th>
                <th className="px-4 py-3 font-semibold">{t("FazerCards cost")}</th>
                <th className="px-4 py-3 font-semibold">{t("Profit")}</th>
                <th className="px-4 py-3 font-semibold">{t("On sale")}</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map((row) => {
                const id = `${row.gameId}|${row.key}`;
                const current = prices?.get(id);
                const active = current?.active ?? false;
                const value = drafts[id] ?? (current ? current.price_usd.toFixed(2) : "");
                const offer = offerOf(row.key);
                const cost = offerCost(offer) ?? fazerCosts[id];
                const price = Number(value || row.fallback);
                const profit = cost !== undefined && price > 0 ? price - cost : null;
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
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-[#1C3CB2]"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={offer}
                        disabled={saving === id || !prices || offers.length === 0}
                        onChange={(e) => setOffer(row, e.target.value)}
                        className="max-w-[220px] rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#1C3CB2]"
                      >
                        <option value="">{t("Manual")}</option>
                        {offer && !offers.some((o) => o.name === offer) && (
                          <option value={offer}>{offer}</option>
                        )}
                        {offers.map((o) => (
                          <option key={o.name} value={o.name}>
                            {o.name} (${o.cost.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {cost === undefined ? t("Manual") : `$${cost.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3">
                      {profit === null ? (
                        "—"
                      ) : profit < 0 ? (
                        <span className="font-semibold text-red-600">{t("Below cost")}</span>
                      ) : (
                        <span className="font-semibold text-green-700">
                          ${profit.toFixed(2)} ({Math.round((profit / cost!) * 100)}%)
                        </span>
                      )}
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
                        {active ? t("On") : current ? t("Off") : t("Not listed")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={saving === id || !prices || drafts[id] === undefined}
                        onClick={() => save(row, current ? active : true)}
                        className="rounded-lg bg-[#1C3CB2] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
                      >
                        {saving === id ? t("Saving…") : t("Save")}
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50/60">
                <td className="px-4 py-3">
                  <input
                    value={newAmt}
                    placeholder={t("New package, e.g. 86")}
                    onChange={(e) => setNewAmt(e.target.value)}
                    className="w-40 rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:border-[#1C3CB2]"
                  />
                  <span className="ml-1 text-xs text-gray-500">{game.unit}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={newPrice}
                      placeholder="0.00"
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:border-[#1C3CB2]"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={newOffer}
                    onChange={(e) => setNewOffer(e.target.value)}
                    className="max-w-[220px] rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#1C3CB2]"
                  >
                    <option value="">{t("Manual")}</option>
                    {offers.map((o) => (
                      <option key={o.name} value={o.name}>
                        {o.name} (${o.cost.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {offerCost(newOffer) !== undefined ? `$${offerCost(newOffer)!.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {offerCost(newOffer) !== undefined && Number(newPrice) > 0 ? (
                    Number(newPrice) < offerCost(newOffer)! ? (
                      <span className="font-semibold text-red-600">{t("Below cost")}</span>
                    ) : (
                      <span className="font-semibold text-green-700">
                        ${(Number(newPrice) - offerCost(newOffer)!).toFixed(2)}
                      </span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={saving === "new" || !prices || !newAmt.trim() || !newPrice}
                    onClick={addPackage}
                    className="whitespace-nowrap rounded-lg bg-[#28C76F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
                  >
                    {saving === "new" ? t("Saving…") : t("Add package")}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
