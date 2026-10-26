import { useState } from "react";
import { findGamesDropOffers } from "@/lib/delivery.functions";
import type { CatalogOffer } from "@/lib/delivery";

// Looks up GamesDrop offer IDs by name so the owner can paste them next to
// each package below.
export function GamesDropOfferSearch() {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CatalogOffer[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      setResults(await findGamesDropOffers({ data: { search } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed.");
      setResults(null);
    }
    setBusy(false);
  }

  return (
    <div className="vx-card p-5 text-sm space-y-3">
      <p className="text-gray-600">
        Find GamesDrop offer IDs, then put each one next to its package in the "GamesDrop offer"
        column. Packages with an offer can be delivered automatically.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Mobile Legends"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#7367F0]"
        />
        <button
          disabled={busy || search.trim().length < 2}
          className="rounded-lg bg-[#7367F0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-30"
        >
          {busy ? "Searching…" : "Search GamesDrop"}
        </button>
      </form>
      {err && <p className="text-red-600">⚠️ {err}</p>}
      {results && results.length === 0 && <p className="text-gray-400">No offers found.</p>}
      {results && results.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Offer ID</th>
                <th className="px-3 py-2">Offer</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r) => (
                <tr key={r.offerId}>
                  <td className="px-3 py-2 font-mono font-semibold">{r.offerId}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-gray-500">{r.product}</td>
                  <td className="px-3 py-2">
                    {r.price !== null ? `${r.price} ${r.currency}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
