// UI-only copy: demo orders kept in this browser tab only (sessionStorage).
// Nothing is sent anywhere and no real payment is ever made.
import { findGame, getHotItems, getPackages } from "@/lib/games";
import type { GuestOrderView } from "@/lib/guest-order.server";
import type { PaymentState } from "@/lib/payment.server";

const KEY = "yuric-ui-demo-orders";

// Not a real KHQR: scanning it in a bank app does nothing.
export const DEMO_QR = "YURIC-TOPUP-UI-DEMO-NOT-A-REAL-PAYMENT";

function readAll(): Record<string, GuestOrderView> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Record<string, GuestOrderView>;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, GuestOrderView>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private mode: the order page then shows "not found", which is fine for a demo.
  }
}

export function demoPrice(gameId: string, packageAmt: string): number {
  const unit = findGame(gameId)?.unit ?? "";
  const pkg = getPackages(gameId).find((p) => `${p.amt} ${unit}` === packageAmt);
  const hot = getHotItems(gameId).find((h) => `${h.label} ${unit}` === packageAmt || h.label === packageAmt);
  return pkg?.price ?? hot?.price ?? 1;
}

export function createDemoOrder(input: {
  gameId: string;
  packageAmt: string;
  playerId: string;
  playerZone?: string | undefined;
}): { orderId: string; price: number; token: string } {
  const orderId = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  const price = demoPrice(input.gameId, input.packageAmt);
  const all = readAll();
  all[orderId] = {
    id: orderId,
    gameId: input.gameId,
    gameName: findGame(input.gameId)?.name ?? input.gameId,
    packageAmt: input.packageAmt,
    price,
    playerId: input.playerId,
    playerZone: input.playerZone ?? null,
    status: "pending",
    paid: false,
    createdAt: new Date().toISOString(),
  };
  writeAll(all);
  return { orderId, price, token };
}

export function loadDemoOrder(orderId: string): GuestOrderView | null {
  return readAll()[orderId] ?? null;
}

export function demoPayment(orderId: string): PaymentState {
  const order = loadDemoOrder(orderId);
  return {
    available: true,
    qr: DEMO_QR,
    amount: order?.price ?? 1,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    paid: false,
    status: "pending",
  };
}
