import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getIdConfig } from "@/lib/player-id";
import { checkGamesDropOrder, placeGamesDropOrder, type DeliveryResult } from "@/lib/delivery";

export type DeliveryResponse = { ok: boolean; message: string; status?: string };

export function adminDb(): SupabaseClient {
  return supabaseAdmin as unknown as SupabaseClient;
}

export function gamesDropToken(): string {
  const token = process.env["GAMESDROP_API_TOKEN"];
  if (!token) throw new Error("GAMESDROP_API_TOKEN is not set.");
  return token;
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
      ...(status === "completed" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);
}

function describe(result: DeliveryResult): DeliveryResponse {
  const base = `GamesDrop: ${result.supplierStatus}`;
  return {
    ok: result.status !== "failed",
    status: result.notPlaced ? "pending" : result.status,
    message: result.message ? `${base} — ${result.message}` : base,
  };
}

/**
 * Buys a paid order's package from GamesDrop. Used by the owner's Deliver
 * button and by the automatic payment check.
 */
export async function deliverPaidOrder(
  db: SupabaseClient,
  orderId: string,
  { allowUnpaid = false }: { allowUnpaid?: boolean } = {},
): Promise<DeliveryResponse> {
  // Claim the order so two clicks don't race; GamesDrop's transactionId is the
  // real guard against buying twice. Unpaid orders are never bought by mistake.
  let claim = db
    .from("orders")
    .update({ status: "processing", supplier_status: "PLACING" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"])
    .is("supplier_order_id", null);
  if (!allowUnpaid) claim = claim.not("paid_at", "is", null);
  const { data: order } = await claim
    .select("id, game_id, package_amt, player_id, player_zone, paid_at")
    .maybeSingle();
  if (!order) {
    return {
      ok: false,
      message: allowUnpaid
        ? "This order is not waiting for delivery."
        : "This order is not paid by Bakong yet (or is not waiting for delivery).",
    };
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
    return { ok: false, message: "This order has no GamesDrop order yet." };
  const result = await checkGamesDropOrder(order.supplier_order_id, { token: gamesDropToken() });
  await saveResult(db, orderId, result);
  return describe(result);
}
