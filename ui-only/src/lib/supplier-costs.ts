import { games, getHotItems, getPackages, serverGames } from "@/lib/games";

export const COSTS_DATE = "demo";

function buildCosts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of [...games, ...serverGames]) {
    for (const p of getPackages(g.id)) {
      if (p.price != null) out[`${g.id}|${p.amt} ${g.unit}`] = Math.round(p.price * 88) / 100;
    }
    for (const h of getHotItems(g.id)) out[`${g.id}|${h.label}`] = Math.round(h.price * 88) / 100;
  }
  return out;
}

export const supplierCosts: Record<string, number> = buildCosts();

export const supplierOffers: Record<string, { name: string; cost: number }[]> = {};

export const supplierCatalog: Record<string, { offers: Record<string, string> }> = {};
