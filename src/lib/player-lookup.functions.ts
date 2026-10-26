import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import {
  cachedLookup,
  lookupRoblox,
  lookupWithGamesDrop,
  parseOfferIds,
  type LookupResult,
} from "@/lib/player-lookup";

const lookupInput = z.object({
  gameId: z.string().min(1).max(40),
  primary: z.string().max(64),
  secondary: z.string().max(64).optional(),
});

export const lookupPlayer = createServerFn({ method: "POST" })
  .validator(lookupInput)
  .handler(async ({ data }): Promise<LookupResult> => {
    // Malformed IDs never reach the supplier.
    if (validatePlayerId(data.gameId, data.primary, data.secondary ?? ""))
      return { status: "not_found" };
    const { allowRequest } = await import("@/lib/rate-limit");
    const { clientIp } = await import("@/lib/rate-limit.server");
    // Each check may call GamesDrop; too many from one visitor reads as busy.
    if (!allowRequest(`lookup:${clientIp()}`, 20, 60_000)) return { status: "unavailable" };
    if (data.gameId === "roblox") return cachedLookup(data, () => lookupRoblox(data.primary));
    const usesServerPicker = !!getIdConfig(data.gameId).secondary?.options;
    return cachedLookup(data, async () => {
      const offerIds = parseOfferIds(process.env["GAMESDROP_OFFER_IDS"]);
      // Without an override, any GamesDrop offer set for this game in the
      // Prices tab can check the player.
      if (!offerIds[data.gameId]) {
        const { adminDb } = await import("@/lib/delivery.server");
        const { data: row } = await adminDb()
          .from("supplier_offers")
          .select("gamesdrop_offer_id")
          .eq("game_id", data.gameId)
          .limit(1)
          .maybeSingle();
        if (row) offerIds[data.gameId] = row.gamesdrop_offer_id;
      }
      return lookupWithGamesDrop(data, {
        token: process.env["GAMESDROP_API_TOKEN"],
        offerIds,
        usesServerPicker,
      });
    });
  });
