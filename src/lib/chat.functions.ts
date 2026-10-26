import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { games } from "@/lib/games";
import {
  cleanReply,
  DEFAULT_MODEL,
  gamesInChat,
  MAX_TEXT,
  MAX_TURNS,
  modelMessages,
  systemPrompt,
  type LivePrice,
} from "@/lib/chatAi";

type WorkersAi = {
  run: (model: string, input: Record<string, unknown>) => Promise<{ response?: unknown }>;
};

const askInput = z.object({
  turns: z
    .array(z.object({ role: z.enum(["user", "bot"]), text: z.string().max(2000) }))
    .min(1)
    .max(40),
});

/** The Workers AI binding ("AI" in the Wrangler config); missing outside Cloudflare. */
function workersAi(): WorkersAi | undefined {
  const env = (globalThis as { __env__?: { AI?: WorkersAi } }).__env__;
  return env?.AI;
}

async function livePrices(gameIds: string[]): Promise<Record<string, LivePrice[]>> {
  const focus: Record<string, LivePrice[]> = Object.fromEntries(gameIds.map((id) => [id, []]));
  if (!gameIds.length) return focus;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("product_prices")
    .select("game_id, package_amt, price_usd, active")
    .in("game_id", gameIds);
  for (const row of data ?? []) {
    if (!row.active) continue;
    const unit = games.find((g) => g.id === row.game_id)?.unit ?? "";
    const amt = row.package_amt.endsWith(` ${unit}`)
      ? row.package_amt.slice(0, -unit.length - 1)
      : row.package_amt;
    focus[row.game_id]?.push({ amt, price: Number(row.price_usd) });
  }
  for (const list of Object.values(focus)) list.sort((a, b) => a.price - b.price);
  return focus;
}

/**
 * Yuric Bot's free-form answer from Workers AI, or null when the AI is not
 * available (no binding, daily free quota used up, too many questions); the
 * widget then falls back to the keyword answers in chatBrain.ts.
 */
export const askBot = createServerFn({ method: "POST" })
  .validator(askInput)
  .handler(async ({ data }): Promise<{ text: string } | null> => {
    const ai = workersAi();
    if (!ai) return null;
    const { allowRequest } = await import("@/lib/rate-limit");
    const { clientIp } = await import("@/lib/rate-limit.server");
    // Every answer spends the shared free quota, so one visitor can't use it all.
    if (!allowRequest(`chat:${clientIp()}`, 12, 60_000)) return null;

    const turns = data.turns
      .slice(-MAX_TURNS)
      .map((t) => ({ ...t, text: t.text.slice(0, MAX_TEXT) }));
    try {
      const system = systemPrompt(await livePrices(gamesInChat(turns)));
      const result = await ai.run(process.env["YURIC_BOT_MODEL"] || DEFAULT_MODEL, {
        messages: modelMessages(turns, system),
        max_tokens: 450,
        temperature: 0.3,
      });
      const text = typeof result.response === "string" ? cleanReply(result.response) : "";
      return text ? { text } : null;
    } catch (error) {
      console.error("Yuric Bot AI failed", error);
      return null;
    }
  });
