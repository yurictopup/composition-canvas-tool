import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import {
  cachedLookup,
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
