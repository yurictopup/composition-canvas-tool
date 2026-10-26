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
    return cachedLookup(data, () =>
      lookupWithGamesDrop(data, {
        token: process.env["GAMESDROP_API_TOKEN"],
        offerIds: parseOfferIds(process.env["GAMESDROP_OFFER_IDS"]),
        usesServerPicker,
      }),
    );
  });
