import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// The owner's sales switch (public.store_settings, flipped on /admin > Prices).
// While sales are off, the shop shows "coming soon" instead of packages and new
// orders are refused; paid orders are still delivered. If the table can't be
// read (not created yet), the shop stays open as before.

export type StoreStatus = { salesOpen: boolean; hiddenGames: string[] };

const OPEN: StoreStatus = { salesOpen: true, hiddenGames: [] };

export async function fetchStoreStatus(db: SupabaseClient = supabase): Promise<StoreStatus> {
  const { data, error } = await db
    .from("store_settings")
    .select("sales_open, hidden_games")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return OPEN;
  return { salesOpen: !!data.sales_open, hiddenGames: data.hidden_games ?? [] };
}

/** True when the shop sells this game right now. */
export function gameOnSale(status: StoreStatus, gameId: string): boolean {
  return status.salesOpen && !status.hiddenGames.includes(gameId);
}

/** Server check before a new order or KHQR: false when the owner paused sales for this game. */
export async function salesOpenFor(db: SupabaseClient, gameId: string): Promise<boolean> {
  return gameOnSale(await fetchStoreStatus(db), gameId);
}

let cached: StoreStatus | null = null;
const listeners = new Set<(s: StoreStatus) => void>();

/** Lets /admin show its change in the shop at once (same tab). */
export function setStoreStatus(status: StoreStatus) {
  cached = status;
  listeners.forEach((l) => l(status));
}

/** The sales switch; null while loading (packages stay hidden until it is known). */
export function useStoreStatus(): StoreStatus | null {
  const [status, setStatus] = useState<StoreStatus | null>(cached);
  useEffect(() => {
    listeners.add(setStatus);
    fetchStoreStatus().then(setStoreStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);
  return status;
}
