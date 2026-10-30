import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getIdConfig } from "@/lib/player-id";
import { fazerGiftCards, fazerTelegram } from "@/lib/fazercards-catalog";
import { checkGamesDropOrder, placeGamesDropOrder, type DeliveryResult } from "@/lib/delivery";
import {
  checkFazerOrder,
  FazerCardsError,
  fetchFazerAccount,
  listFazerOrders,
  placeFazerGiftCard,
  placeFazerOrder,
  placeFazerTelegram,
  type FazerAccount,
  type FazerOrder,
} from "@/lib/fazercards";

export type DeliveryResponse = { ok: boolean; message: string; status?: string };

// Supplier states that mean a buy may have gone through but we never got its
// answer (a timeout, a 5xx, or a call cut off while PLACING). Such an order is
// never sent again by itself: the owner checks the FazerCards panel first.
export const UNKNOWN = "UNKNOWN";
const IN_DOUBT = ["PLACING", UNKNOWN, "UNCONFIRMED"];

export function adminDb(): SupabaseClient {
  return supabaseAdmin as unknown as SupabaseClient;
}

export function gamesDropToken(): string {
  const token = process.env["GAMESDROP_API_TOKEN"];
  if (!token) throw new Error("GAMESDROP_API_TOKEN is not set.");
  return token;
}

/** FazerCards delivers when its key is set; GamesDrop is the older fallback. */
function fazerKey(): string | undefined {
  return process.env["FAZERCARDS_API_KEY"] || undefined;
}

async function saveResult(db: SupabaseClient, orderId: string, result: DeliveryResult) {
  // Refused before buying: back to pending so it can be retried after the fix.
  const status = result.notPlaced ? "pending" : result.status;
  await db
    .from("orders")
    .update({
      status,
      supplier_status: result.supplierStatus,
      ...(result.supplierOrderId ? { supplier_order_id: result.supplierOrderId } : {}),
      ...(result.codes?.length ? { delivery_codes: result.codes } : {}),
      ...(status === "completed" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);
}

function describe(result: DeliveryResult): DeliveryResponse {
  const base = `${fazerKey() ? "FazerCards" : "GamesDrop"}: ${result.supplierStatus}`;
  return {
    ok: result.status !== "failed",
    status: result.notPlaced ? "pending" : result.status,
    message: result.message ? `${base} — ${result.message}` : base,
  };
}

/**
 * Buys a paid order's package from FazerCards (or GamesDrop). Used by the owner's Deliver
 * button and by the automatic payment check.
 */
export async function deliverPaidOrder(
  db: SupabaseClient,
  orderId: string,
  {
    allowUnpaid = false,
    confirmedNotPlaced = false,
  }: { allowUnpaid?: boolean; confirmedNotPlaced?: boolean } = {},
): Promise<DeliveryResponse> {
  // Claim the order in one UPDATE, so two calls (two clicks, or the cron and
  // the payment check) can't both win: Postgres re-checks the WHERE after the
  // first one commits, and the order is PLACING by then. An order in doubt
  // (UNKNOWN) is only sent again when the owner confirmed on the FazerCards
  // panel that it is not there. Unpaid orders are never bought by mistake.
  const blocked = confirmedNotPlaced ? ["PLACING"] : IN_DOUBT;
  let claim = db
    .from("orders")
    .update({ status: "processing", supplier_status: "PLACING" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"])
    .is("supplier_order_id", null)
    .or(`supplier_status.is.null,supplier_status.not.in.(${blocked.join(",")})`);
  if (!allowUnpaid) claim = claim.not("paid_at", "is", null);
  const { data: order } = await claim
    .select("id, game_id, package_amt, player_id, player_zone, paid_at, price_usd")
    .maybeSingle();
  if (!order) {
    return {
      ok: false,
      message: allowUnpaid
        ? "This order is not waiting for delivery (or is being bought right now, or its supplier result is unknown)."
        : "This order is not paid by Bakong yet (or is not waiting for delivery, is being bought right now, or its supplier result is unknown).",
    };
  }

  const apiKey = fazerKey();
  if (apiKey) {
    const { data: offerRow } = await db
      .from("package_offers")
      .select("fazer_offer")
      .eq("game_id", order.game_id)
      .eq("package_amt", order.package_amt)
      .maybeSingle();
    const fazerOffer = (offerRow as { fazer_offer?: string } | null)?.fazer_offer ?? null;
    // Telegram goes to a username, Roblox is a gift card code, every other game is a
    // top-up to the player ID.
    const result = fazerTelegram[order.game_id]
      ? await placeFazerTelegram(order, { apiKey })
      : fazerGiftCards[order.game_id]
        ? await placeFazerGiftCard(order, { apiKey, picked: fazerOffer })
        : await placeFazerOrder({ ...order, fazer_offer: fazerOffer }, { apiKey });
    if (result.supplierStatus === "NO_OFFER") {
      // Not sold through the API (Roblox, bundles): stays under Paid not delivered.
      await db
        .from("orders")
        .update({ status: order.paid_at ? "processing" : "pending", supplier_status: "NO_OFFER" })
        .eq("id", orderId);
      return { ok: false, message: result.message ?? "Deliver this package by hand." };
    }
    await saveResult(db, orderId, result);
    return describe(result);
  }

  const { data: offer } = await db
    .from("supplier_offers")
    .select("gamesdrop_offer_id")
    .eq("game_id", order.game_id)
    .eq("package_amt", order.package_amt)
    .maybeSingle();
  if (!offer) {
    // A paid order stays "processing" so the owner sees it under Paid not delivered.
    await db
      .from("orders")
      .update({ status: order.paid_at ? "processing" : "pending", supplier_status: "NO_OFFER" })
      .eq("id", orderId);
    return {
      ok: false,
      message: `No GamesDrop offer is set for ${order.package_amt}. Add it in the Prices tab.`,
    };
  }

  const result = await placeGamesDropOrder(order, {
    token: gamesDropToken(),
    offerId: offer.gamesdrop_offer_id,
    usesServerPicker: !!getIdConfig(order.game_id).secondary?.options,
  });
  await saveResult(db, orderId, result);
  return describe(result);
}

export async function refreshPaidOrder(
  db: SupabaseClient,
  orderId: string,
): Promise<DeliveryResponse> {
  const { data: order } = await db
    .from("orders")
    .select("supplier_order_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order?.supplier_order_id)
    return { ok: false, message: "This order has no supplier order yet." };
  const apiKey = fazerKey();
  const result = apiKey
    ? await checkFazerOrder(order.supplier_order_id, { apiKey })
    : await checkGamesDropOrder(order.supplier_order_id, { token: gamesDropToken() });
  await saveResult(db, orderId, result);
  return describe(result);
}

export type SupplierStock =
  ({ ok: true } & FazerAccount) | { ok: false; reason: "no_key" | "error"; message?: string };

/** FazerCards balance and plan; never throws, so the dashboard always renders. */
export async function supplierStock(): Promise<SupplierStock> {
  const apiKey = fazerKey();
  if (!apiKey) return { ok: false, reason: "no_key" };
  try {
    return { ok: true, ...(await fetchFazerAccount({ apiKey })) };
  } catch (error) {
    // The owner sees this reason on the stock card; it also goes to Worker Logs.
    let message = error instanceof Error ? error.message : String(error);
    if (error instanceof FazerCardsError) {
      const extra = [error.httpStatus && `HTTP ${error.httpStatus}`, error.code].filter(Boolean);
      if (extra.length && !message.includes(extra.join(" "))) message += ` (${extra.join(" ")})`;
    }
    console.error("FazerCards stock check failed:", message);
    return { ok: false, reason: "error", message };
  }
}

export type SupplierOrders =
  | { ok: true; orders: FazerOrder[] }
  | { ok: false; reason: "no_key" | "error"; message?: string };

/** The newest FazerCards orders; never throws, so the dashboard always renders. */
export async function supplierOrders(): Promise<SupplierOrders> {
  const apiKey = fazerKey();
  if (!apiKey) return { ok: false, reason: "no_key" };
  try {
    return { ok: true, orders: await listFazerOrders({ apiKey }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("FazerCards order list failed:", message);
    return { ok: false, reason: "error", message };
  }
}
