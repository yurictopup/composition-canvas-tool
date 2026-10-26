import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Selling prices live in the Supabase `product_prices` table. The database
// charges these prices on every order, and the owner edits them on /admin,
// so the shop shows the same numbers. Rows are keyed by "<amt> <unit>",
// the same text an order stores in package_amt.
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
  let query = supabase.from("product_prices").select("*");
  if (gameId) query = query.eq("game_id", gameId);
  const { data, error } = await query;
  if (error || !data) return null;
  const map: PriceMap = new Map();
  for (const row of data as unknown as PriceRow[]) {
    map.set(`${row.game_id}|${row.package_amt}`, { ...row, price_usd: Number(row.price_usd) });
  }
  return map;
}

/** Prices for one game; null while loading or when the table can't be read. */
export function useLivePrices(gameId: string): PriceMap | null {
  const [prices, setPrices] = useState<PriceMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchPrices(gameId).then((map) => {
      if (!cancelled) setPrices(map);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);
  return prices;
}

/**
 * The price to show for a package. Until live prices load, the fallback from
 * games.ts is shown; once loaded, a package missing from the table or switched
 * off is not for sale (null), because the database would refuse the order.
 */
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
