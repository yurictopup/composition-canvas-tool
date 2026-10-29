import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findGame } from "@/lib/games";
import {
  answerText,
  botModels,
  cleanReply,
  gamesInChat,
  MAX_TEXT,
  MAX_TURNS,
  modelMessages,
  orderReply,
  systemPrompt,
  type LivePrice,
  type OrderContext,
} from "@/lib/chatAi";
import { isOrderQuestion } from "@/lib/chatBrain";

export type WorkersAi = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

// Only the last MAX_TURNS turns (MAX_TEXT characters each) reach the model, so
// the widget sends no more than that and anything bigger is refused unread.
const askInput = z.object({
  turns: z
    .array(z.object({ role: z.enum(["user", "bot"]), text: z.string().max(MAX_TEXT) }))
    .min(1)
    .max(MAX_TURNS),
});

/** The Workers AI binding ("AI" in the Wrangler config); missing outside Cloudflare. */
export function workersAi(): WorkersAi | undefined {
  const env = (globalThis as { __env__?: { AI?: WorkersAi } }).__env__;
  return env?.AI;
}

async function livePrices(gameIds: string[]): Promise<Record<string, LivePrice[]>> {
  const focus: Record<string, LivePrice[]> = Object.fromEntries(gameIds.map((id) => [id, []]));
  if (!gameIds.length) return focus;
  const { supabase } = await import("@/integrations/supabase/client");
  const { fetchStoreStatus, gameOnSale } = await import("@/lib/store-status");
  const status = await fetchStoreStatus(supabase);
  const { data } = await supabase
    .from("product_prices")
    .select("game_id, package_amt, price_usd, active")
    .in("game_id", gameIds);
  for (const row of data ?? []) {
    if (!row.active || !gameOnSale(status, row.game_id)) continue;
    const unit = findGame(row.game_id)?.unit ?? "";
    const amt = row.package_amt.endsWith(` ${unit}`)
      ? row.package_amt.slice(0, -unit.length - 1)
      : row.package_amt;
    focus[row.game_id]?.push({ amt, price: Number(row.price_usd) });
  }
  for (const list of Object.values(focus)) list.sort((a, b) => a.price - b.price);
  return focus;
}

/** The signed-in visitor's id from the token the site sends with server calls, or null. */
async function signedInUser(): Promise<string | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const token = getRequest()
    ?.headers.get("authorization")
    ?.replace(/^Bearer /, "");
  if (!token || token.split(".").length !== 3) return null;
  const { adminDb } = await import("@/lib/delivery.server");
  const { data } = await adminDb().auth.getUser(token);
  return data.user?.id ?? null;
}

/**
 * The customer's last orders. Unpaid recent ones are first checked with the
 * bank (the same check the payment page runs), so "did my money arrive?" gets
 * a live answer.
 */
async function customerOrders(): Promise<OrderContext> {
  const userId = await signedInUser();
  if (!userId) return null;
  const { adminDb } = await import("@/lib/delivery.server");
  const db = adminDb();
  const load = () =>
    db
      .from("orders")
      .select(
        "id, game_name, package_amt, price_usd, player_id, player_zone, status, created_at, paid_at, payment_md5, payment_expires_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
  let { data: rows } = await load();
  const dayAgo = Date.now() - 24 * 3600_000;
  const unpaid = (rows ?? []).filter(
    (o) => !o.paid_at && o.payment_md5 && new Date(o.created_at).getTime() > dayAgo,
  );
  if (unpaid.length) {
    const { checkOrderPayment } = await import("@/lib/payment.server");
    const { bankCheckAllowed } = await import("@/lib/rate-limit.server");
    await Promise.all(
      unpaid.map((o) =>
        checkOrderPayment(db, o.id, userId, {
          beforeBankCheck: () => bankCheckAllowed(o.id),
        }).catch(() => null),
      ),
    );
    ({ data: rows } = await load());
  }
  return (rows ?? []).map((o) => ({
    code: o.id.slice(0, 8).toUpperCase(),
    game: o.game_name,
    pack: o.package_amt,
    price: Number(o.price_usd),
    playerId: o.player_zone ? `${o.player_id} (${o.player_zone})` : o.player_id,
    minutesAgo: Math.max(0, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60_000)),
    paid: !!o.paid_at,
    status: o.status,
    qrExpired:
      !o.paid_at && !!o.payment_expires_at && new Date(o.payment_expires_at).getTime() < Date.now(),
  }));
}

/**
 * Yuric Bot's free-form answer from Workers AI, or why the AI is not
 * available (no binding, daily free quota used up, too many questions); the
 * widget then falls back to the keyword answers in chatBrain.ts.
 */
export const askBot = createServerFn({ method: "POST" })
  .validator(askInput)
  .handler(
    async ({
      data,
    }): Promise<{ text: string; source: "ai" | "orders" } | { unavailable: string }> => {
      const { rule } = await import("@/lib/rate-limit");
      const { checkLimits, clientIp } = await import("@/lib/rate-limit.server");
      // Every answer spends the shared free quota, so one visitor can't use it all.
      const ip = clientIp();
      if (!(await checkLimits([rule("chatIp", ip), rule("chatIpDay", ip)])).allowed)
        return { unavailable: "rate limit" };

      const turns = data.turns
        .slice(-MAX_TURNS)
        .map((t) => ({ ...t, text: t.text.slice(0, MAX_TEXT) }));
      // Orders are looked up only when the latest question is about paying or an order.
      const last = turns.filter((t) => t.role === "user").at(-1)?.text ?? "";
      const orderQuestion = isOrderQuestion(last);
      const [prices, orders] = await Promise.all([
        livePrices(gamesInChat(turns)).catch(() => ({})),
        orderQuestion ? customerOrders().catch(() => undefined) : undefined,
      ]);

      const errors: string[] = [];
      const ai = workersAi();
      if (!ai) errors.push("no AI binding");
      else {
        const messages = modelMessages(turns, systemPrompt(prices, orders));
        // If one model is missing or busy, the next one answers.
        for (const model of botModels()) {
          try {
            const result = await ai.run(model, { messages, max_tokens: 450, temperature: 0.3 });
            const text = cleanReply(answerText(result));
            if (text) return { text, source: "ai" };
            errors.push(`${model}: empty answer`);
          } catch (error) {
            errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        console.error("Yuric Bot AI failed", errors);
      }
      // Without the AI, a payment question still gets the real order check.
      if (orderQuestion && orders !== undefined)
        return { text: orderReply(orders), source: "orders" };
      // The reason stays in the Worker logs; visitors only learn the AI is off.
      return { unavailable: ai ? "AI failed" : "no AI binding" };
    },
  );

/**
 * The quick bot's payment check, without the AI: the signed-in customer's
 * latest orders, checked with the bank, as a short Khmer reply.
 */
export const checkMyOrders = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ text: string } | { unavailable: string }> => {
    const { rule } = await import("@/lib/rate-limit");
    const { checkLimits, clientIp } = await import("@/lib/rate-limit.server");
    if (!(await checkLimits([rule("chatOrdersIp", clientIp())])).allowed)
      return { unavailable: "rate limit" };
    const orders = await customerOrders().catch(() => undefined);
    if (orders === undefined) return { unavailable: "order lookup failed" };
    return { text: orderReply(orders) };
  },
);
