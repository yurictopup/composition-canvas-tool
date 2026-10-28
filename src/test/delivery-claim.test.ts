import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

const { deliverPaidOrder } = await import("@/lib/delivery.server");

type Row = Record<string, unknown>;

// A tiny in-memory stand-in for the orders table. Each query runs whole at the
// moment it is sent, like one SQL statement, so two claims are serialized the
// way Postgres serializes two UPDATEs of the same row.
function memoryDb(orders: Row[]) {
  const matchOr = (row: Row, expr: string) =>
    splitTop(expr).some((part) => {
      const [col, ...rest] = part.split(".");
      const op = rest.join(".");
      const value = row[col!];
      if (op === "is.null") return value == null;
      if (op.startsWith("not.in.(")) return !listOf(op).includes(String(value)) && value != null;
      if (op.startsWith("neq.")) return value != null && String(value) !== op.slice(4);
      throw new Error(`fake db: unsupported or() filter ${part}`);
    });
  return {
    from(table: string) {
      const filters: ((row: Row) => boolean)[] = [];
      let values: Row | null = null;
      const run = () => {
        if (table !== "orders") return [];
        const hits = orders.filter((row) => filters.every((f) => f(row)));
        if (values) for (const row of hits) Object.assign(row, values, { updated_at: Date.now() });
        return hits.map((row) => ({ ...row }));
      };
      const chain: Record<string, unknown> = {
        update(v: Row) {
          values = v;
          return chain;
        },
        select: () => chain,
        eq(col: string, v: unknown) {
          filters.push((row) => row[col] === v);
          return chain;
        },
        in(col: string, list: unknown[]) {
          filters.push((row) => list.includes(row[col]));
          return chain;
        },
        is(col: string, v: null) {
          filters.push((row) => row[col] === v || (v === null && row[col] === undefined));
          return chain;
        },
        not(col: string, _op: "is", _v: null) {
          filters.push((row) => row[col] != null);
          return chain;
        },
        or(expr: string) {
          filters.push((row) => matchOr(row, expr));
          return chain;
        },
        maybeSingle() {
          const data = run()[0] ?? null;
          return Promise.resolve({ data });
        },
        then(resolve: (v: unknown) => void) {
          resolve({ data: run() });
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

function splitTop(expr: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  return [...out, cur];
}

const listOf = (op: string) => op.slice(op.indexOf("(") + 1, -1).split(",");

const paidOrder = (extra: Row = {}): Row & { id: string } => ({
  id: "11111111-1111-4111-8111-111111111111",
  game_id: "mlbb",
  package_amt: "86 Diamonds",
  player_id: "12345678",
  player_zone: "1234",
  price_usd: 1.5,
  paid_at: "2026-10-28T00:00:00Z",
  status: "processing",
  supplier_status: null,
  supplier_order_id: null,
  ...extra,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// FazerCards: the offers list answers at once; the buy answers with `buy`.
let buyCalls: { key: string | null }[] = [];
function fazer(buy: () => Promise<Response>) {
  buyCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/topups/offers")) {
        return json({
          ok: true,
          offers: [{ offer_id: "o86", name: "78 + 8 Diamonds", price_usd: 1.2 }],
          fields: [{ key: "user_id" }, { key: "zone_id" }],
        });
      }
      if (url.endsWith("/topups/order")) {
        buyCalls.push({ key: new Headers(init?.headers).get("Idempotency-Key") });
        return buy();
      }
      throw new Error(`unexpected call ${url}`);
    }),
  );
}

beforeEach(() => {
  process.env["FAZERCARDS_API_KEY"] = "test-key";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deliverPaidOrder", () => {
  it("buys only once when two deliveries start at the same time", async () => {
    let answer!: (r: Response) => void;
    fazer(() => new Promise<Response>((resolve) => (answer = resolve)));
    const row = paidOrder();
    const db = memoryDb([row]);

    const first = deliverPaidOrder(db, row.id);
    const second = deliverPaidOrder(db, row.id);
    const lost = await second;
    expect(lost.ok).toBe(false);
    expect(row["supplier_status"]).toBe("PLACING");

    await vi.waitFor(() => expect(buyCalls).toHaveLength(1));
    answer(json({ ok: true, order: { id: "ord-1", status: "processing" } }));
    const won = await first;

    expect(won.ok).toBe(true);
    expect(buyCalls).toHaveLength(1);
    expect(row).toMatchObject({ supplier_order_id: "ord-1", status: "processing" });
  });

  it("marks an order UNKNOWN when FazerCards times out, and never sends it again by itself", async () => {
    fazer(() => Promise.reject(new DOMException("The operation timed out.", "TimeoutError")));
    const row = paidOrder();
    const db = memoryDb([row]);

    await deliverPaidOrder(db, row.id);
    expect(row).toMatchObject({ status: "processing", supplier_status: "UNKNOWN" });
    expect(buyCalls).toHaveLength(1);

    // Neither the payment check nor a plain Deliver click buys it again.
    const again = await deliverPaidOrder(db, row.id);
    expect(again.ok).toBe(false);
    expect(buyCalls).toHaveLength(1);
    expect(row["supplier_status"]).toBe("UNKNOWN");
  });

  it("sends an UNKNOWN order again only after the owner confirms, with the same Idempotency-Key", async () => {
    fazer(() => Promise.resolve(json({ ok: true, order: { id: "ord-9", status: "processing" } })));
    const row = paidOrder({ supplier_status: "UNKNOWN" });
    const db = memoryDb([row]);

    const res = await deliverPaidOrder(db, row.id, { confirmedNotPlaced: true });
    expect(res.ok).toBe(true);
    expect(buyCalls).toEqual([{ key: row.id }]);
    expect(row["supplier_order_id"]).toBe("ord-9");
  });

  it("never takes over an order another call is still placing, even when confirmed", async () => {
    fazer(() => Promise.resolve(json({ ok: true, order: { id: "ord-2" } })));
    const row = paidOrder({ supplier_status: "PLACING" });
    const res = await deliverPaidOrder(memoryDb([row]), row.id, {
      confirmedNotPlaced: true,
    });
    expect(res.ok).toBe(false);
    expect(buyCalls).toHaveLength(0);
  });

  it("puts an order back to pending when FazerCards clearly refused it", async () => {
    fazer(() =>
      Promise.resolve(
        json({ ok: false, code: "INSUFFICIENT_BALANCE", error: "Not enough balance" }, 402),
      ),
    );
    const row = paidOrder();
    const db = memoryDb([row]);

    const res = await deliverPaidOrder(db, row.id);
    expect(res.ok).toBe(false);
    expect(row).toMatchObject({
      status: "pending",
      supplier_status: "INSUFFICIENT_BALANCE",
      supplier_order_id: null,
    });

    // A refused order is safe to try again (the cron does this once the balance is topped up).
    fazer(() => Promise.resolve(json({ ok: true, order: { id: "ord-3", status: "completed" } })));
    const retry = await deliverPaidOrder(db, row.id);
    expect(retry.ok).toBe(true);
    expect(buyCalls).toHaveLength(1);
    expect(row).toMatchObject({ status: "completed", supplier_order_id: "ord-3" });
  });

  it("marks a FazerCards 5xx as UNKNOWN, not as refused", async () => {
    fazer(() => Promise.resolve(json({ ok: false, error: "Bad gateway" }, 502)));
    const row = paidOrder();
    await deliverPaidOrder(memoryDb([row]), row.id);
    expect(row).toMatchObject({ status: "processing", supplier_status: "UNKNOWN" });
  });
});
