import type { LookupResult } from "@/lib/player-lookup";
import { validatePlayerId } from "@/lib/player-id";

export async function lookupPlayer({
  data,
}: {
  data: { gameId: string; primary: string; secondary?: string | undefined };
}): Promise<LookupResult> {
  await new Promise((r) => setTimeout(r, 500));
  if (validatePlayerId(data.gameId, data.primary, data.secondary ?? "")) return { status: "not_found" };
  return { status: "found", name: "Demo Player" };
}
