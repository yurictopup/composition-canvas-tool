import { useEffect, useState } from "react";
type Backend = typeof backend;
import { backend } from "@/mock/backend";

export type StoreStatus = { salesOpen: boolean; hiddenGames: string[] };

const OPEN: StoreStatus = { salesOpen: true, hiddenGames: [] };

export async function fetchStoreStatus(db: Backend = backend): Promise<StoreStatus> {
  const { data, error } = await db
    .from("store_settings")
    .select("sales_open, hidden_games")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return OPEN;
  return { salesOpen: !!data.sales_open, hiddenGames: data.hidden_games ?? [] };
}

export function gameOnSale(status: StoreStatus, gameId: string): boolean {
  return status.salesOpen && !status.hiddenGames.includes(gameId);
}

export async function salesOpenFor(db: Backend, gameId: string): Promise<boolean> {
  return gameOnSale(await fetchStoreStatus(db), gameId);
}

let cached: StoreStatus | null = null;
const listeners = new Set<(s: StoreStatus) => void>();

export function setStoreStatus(status: StoreStatus) {
  cached = status;
  listeners.forEach((l) => l(status));
}

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
