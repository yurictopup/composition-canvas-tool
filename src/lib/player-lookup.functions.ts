import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateFazerPlayer } from "@/lib/fazercards";
import { findGame } from "@/lib/games";
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
    const { rule } = await import("@/lib/rate-limit");
    const { checkLimits, clientIp } = await import("@/lib/rate-limit.server");
    // Each check may call a supplier; too many from one visitor reads as busy.
    const ip = clientIp();
    const limit = await checkLimits([rule("lookupIp", ip), rule("lookupIpHour", ip)]);
    if (!limit.allowed) return { status: "unavailable" };
    if (data.gameId === "roblox") return cachedLookup(data, () => lookupRoblox(data.primary));
    const usesServerPicker = !!getIdConfig(data.gameId).secondary?.options;
    return cachedLookup(data, async () => {
      // FazerCards (the delivery supplier) checks the name first.
      const apiKey = process.env["FAZERCARDS_API_KEY"];
      const fazer = apiKey
        ? await validateFazerPlayer(data, { apiKey, gameName: findGame(data.gameId)?.name })
        : ({ status: "unsupported" } as const);
      if (fazer.status === "found" || fazer.status === "not_found") return fazer;
      // Otherwise GamesDrop, when set up. Without it a well-formed ID can still
      // order, with the "double-check your ID" note.
      return gamesDropLookup();
    });

    async function gamesDropLookup(): Promise<LookupResult> {
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
    }
  });
