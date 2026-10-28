// Runs every few minutes from the Cloudflare cron (see src/cron.ts), so orders
// move on even when nobody has a page open:
// 1. a KHQR paid after the customer closed the page is still seen, and its
//    package bought from FazerCards;
// 2. a paid order that FazerCards refused for a low balance (or that was paid
//    before the API key was set) is bought once the balance is topped up;
// 3. a FazerCards order still processing is checked until it is delivered.
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminDb, deliverPaidOrder, refreshPaidOrder, supplierStock } from "@/lib/delivery.server";
import { fazerOfferFor } from "@/lib/fazercards";
import { checkOrderPayment } from "@/lib/payment.server";

const MINUTE = 60_000;
// Unpaid KHQRs are asked about for this long after the order was made.
const PAYMENT_WINDOW_MS = 3 * 60 * MINUTE;
// Paid orders older than this are left to the owner instead of bought by themselves.
const RETRY_WINDOW_MS = 7 * 24 * 60 * MINUTE;
const BATCH = 15;

// Supplier answers that mean nothing was bought and a later try can work.
const RETRYABLE = /BALANCE|INSUFFICIENT|HTTP_402|NO_OFFER/;

export type SweepReport = { checked: number; paid: number; retried: number; refreshed: number };

const since = (ms: number) => new Date(Date.now() - ms).toISOString();

async function sweepPayments(db: SupabaseClient, report: SweepReport) {
  const { data } = await db
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .is("paid_at", null)
    .not("payment_md5", "is", null)
    .gt("created_at", since(PAYMENT_WINDOW_MS))
    .order("created_at", { ascending: false })
    .limit(BATCH);
  for (const { id } of data ?? []) {
    report.checked++;
    const state = await checkOrderPayment(db, id, null);
    if (state.paid) report.paid++;
  }
}

async function retryDeliveries(db: SupabaseClient, report: SweepReport) {
  const { data } = await db
    .from("orders")
    .select("id, game_id, package_amt, price_usd, supplier_status")
    .in("status", ["pending", "processing"])
    .not("paid_at", "is", null)
    .is("supplier_order_id", null)
    .gt("paid_at", since(RETRY_WINDOW_MS))
    .order("paid_at", { ascending: true })
    .limit(BATCH);
  const waiting = (data ?? []).filter(
    (o) =>
      RETRYABLE.test(o.supplier_status ?? "") &&
      // Hand-delivered packages (Roblox, bundles) never go through the API.
      (o.supplier_status !== "NO_OFFER" || !!fazerOfferFor(o.game_id, o.package_amt)),
  );
  if (!waiting.length) return;
  // Only try when FazerCards has money, and never more than the balance covers.
  const stock = await supplierStock();
  if (!stock.ok) return;
  let balance = stock.balance;
  for (const order of waiting) {
    const price = Number(order.price_usd);
    if (balance < price * 0.5) break;
    report.retried++;
    const res = await deliverPaidOrder(db, order.id);
    if (res.ok) balance -= price;
  }
}

async function refreshProcessing(db: SupabaseClient, report: SweepReport) {
  const { data } = await db
    .from("orders")
    .select("id")
    .eq("status", "processing")
    .not("supplier_order_id", "is", null)
    .gt("paid_at", since(RETRY_WINDOW_MS))
    .limit(BATCH);
  for (const { id } of data ?? []) {
    report.refreshed++;
    await refreshPaidOrder(db, id);
  }
}

export async function sweepOrders(db: SupabaseClient = adminDb()): Promise<SweepReport> {
  const report: SweepReport = { checked: 0, paid: 0, retried: 0, refreshed: 0 };
  // Each step on its own, so one failing (e.g. Bakong down) doesn't stop the others.
  for (const step of [sweepPayments, retryDeliveries, refreshProcessing]) {
    try {
      await step(db, report);
    } catch (error) {
      console.error("[sweep]", step.name, error instanceof Error ? error.message : error);
    }
  }
  return report;
}
