import { useEffect, useState } from "react";
import { backend } from "@/mock/backend";

export type PriceRow = {
  game_id: string;
  package_amt: string;
  game_name: string;
  price_usd: number;
  active: boolean;
};

export type PriceMap = Map<string, PriceRow>;

export function packageKey(amt: string, unit: string): string {
  return `${amt} ${unit}`;
}

export async function fetchPrices(gameId?: string): Promise<PriceMap | null> {
  let query = backend
    .from("product_prices")
    .select("game_id, package_amt, game_name, price_usd, active");
  if (gameId) query = query.eq("game_id", gameId);
  const { data, error } = await query;
  if (error || !data) return null;
  const map: PriceMap = new Map();
  for (const row of data as unknown as PriceRow[]) {
    map.set(`${row.game_id}|${row.package_amt}`, { ...row, price_usd: Number(row.price_usd) });
  }
  return map;
}

const priceCache = new Map<string, PriceMap>();

export function useLivePrices(gameId: string): PriceMap | null {
  const [prices, setPrices] = useState<PriceMap | null>(() => priceCache.get(gameId) ?? null);
  useEffect(() => {
    let cancelled = false;
    setPrices(priceCache.get(gameId) ?? null);
    fetchPrices(gameId).then((map) => {
      if (map) priceCache.set(gameId, map);
      if (!cancelled) setPrices(map ?? priceCache.get(gameId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);
  return prices;
}

export function livePrice(
  prices: PriceMap | null,
  gameId: string,
  key: string,
  fallback: number | null,
): number | null {
  if (!prices) return fallback;
  const row = prices.get(`${gameId}|${key}`);
  return row && row.active ? row.price_usd : null;
}

export function packageSize(amt: string): number {
  const m = amt.match(/^(\d+)(?:\s*\+\s*(\d+))?/);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : Number.MAX_SAFE_INTEGER;
}

export function livePackages<P extends { amt: string; price: number | null }>(
  prices: PriceMap | null,
  gameId: string,
  unit: string,
  builtIn: P[],
  hotLabels: string[],
): (P | { amt: string; price: number | null })[] {
  const priced = builtIn.map((p) => ({
    ...p,
    price: livePrice(prices, gameId, packageKey(p.amt, unit), p.price),
  }));
  if (!prices) return priced;
  const known = new Set([...builtIn.map((p) => p.amt), ...hotLabels]);
  const suffix = ` ${unit}`;
  const added = [...prices.values()]
    .filter((r) => r.game_id === gameId && r.active && r.package_amt.endsWith(suffix))
    .map((r) => ({ amt: r.package_amt.slice(0, -suffix.length), price: r.price_usd }))
    .filter((p) => !known.has(p.amt));
  return [...priced.filter((p) => p.price !== null), ...added].sort(
    (a, b) => packageSize(a.amt) - packageSize(b.amt),
  );
}
