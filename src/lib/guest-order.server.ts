import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseGameId, findGame } from "@/lib/games";
import { validatePlayerId } from "@/lib/player-id";

// Guest checkout: a visitor who is not signed in can still order. The order is
// written by the server (service role) with the price from product_prices, and
// the visitor gets a secret link token. The token is an HMAC of the order id,
// so nothing extra is stored and only the server can make one.

function linkSecret(): string {
  const secret = process.env["ORDER_LINK_SECRET"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("ORDER_LINK_SECRET is not set.");
  return secret;
}

export function guestToken(orderId: string): string {
  return createHmac("sha256", linkSecret())
    .update(`guest-order:${orderId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function guestTokenValid(orderId: string, token: string): boolean {
  const expected = Buffer.from(guestToken(orderId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type GuestOrderInput = {
  gameId: string;
  packageAmt: string;
  playerId: string;
  playerZone?: string | undefined;
  contact?: string | undefined;
};

export class GuestOrderError extends Error {}

// Unpaid guest orders allowed for one Player ID per hour, and for the whole shop
// per 10 minutes (stops a flood of fake orders filling the admin list).
const PER_PLAYER_HOUR = 5;
const SHOP_TEN_MINUTES = 60;

export async function createGuestOrder(db: SupabaseClient, input: GuestOrderInput) {
  const game = findGame(input.gameId);
  if (!game) throw new GuestOrderError("This game is not available.");
  const playerId = input.playerId.trim();
  const playerZone = input.playerZone?.trim() || null;
  const idError = validatePlayerId(baseGameId(game.id), playerId, playerZone ?? "");
  if (idError) throw new GuestOrderError(idError);

  const { data: item } = await db
    .from("product_prices")
    .select("game_name, price_usd")
    .eq("game_id", game.id)
    .eq("package_amt", input.packageAmt)
    .eq("active", true)
    .maybeSingle();
  if (!item) throw new GuestOrderError("This package is not available for purchase.");

  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count: playerOpen } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .eq("player_id", playerId)
    .eq("status", "pending")
    .is("paid_at", null)
    .gt("created_at", hourAgo);
  if ((playerOpen ?? 0) >= PER_PLAYER_HOUR) {
    throw new GuestOrderError(
      "Too many unpaid orders. Please pay or wait an hour before ordering again.",
    );
  }
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: shopOpen } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .is("paid_at", null)
    .gt("created_at", tenMinutesAgo);
  if ((shopOpen ?? 0) >= SHOP_TEN_MINUTES) {
    throw new GuestOrderError("The shop is very busy. Please try again in a few minutes.");
  }

  const contact = input.contact?.trim();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      user_id: null,
      // Admin shows this in the customer column.
      user_email: contact ? `Guest · ${contact}` : "Guest",
      game_id: game.id,
      game_name: item.game_name,
      package_amt: input.packageAmt,
      price_usd: item.price_usd,
      payment: "Bakong",
      player_id: playerId,
      player_zone: playerZone,
      status: "pending",
    })
    .select("id, price_usd")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Order failed.");
  return {
    orderId: order.id as string,
    price: Number(order.price_usd),
    token: guestToken(order.id),
  };
}

export type GuestOrderView = {
  id: string;
  gameId: string;
  gameName: string;
  packageAmt: string;
  price: number;
  playerId: string;
  playerZone: string | null;
  status: string;
  paid: boolean;
  createdAt: string;
};

export async function loadGuestOrder(
  db: SupabaseClient,
  orderId: string,
): Promise<GuestOrderView | null> {
  const { data } = await db
    .from("orders")
    .select(
      "id, game_id, game_name, package_amt, price_usd, player_id, player_zone, status, paid_at, created_at",
    )
    .eq("id", orderId)
    .is("user_id", null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    gameId: data.game_id,
    gameName: data.game_name,
    packageAmt: data.package_amt,
    price: Number(data.price_usd),
    playerId: data.player_id,
    playerZone: data.player_zone,
    status: data.status,
    paid: !!data.paid_at,
    createdAt: data.created_at,
  };
}
