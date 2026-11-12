import { findGame, games, getHotItems, getPackages, serverGames } from "@/lib/games";
import type { SupplierOrder } from "@/lib/delivery.server";

type Row = Record<string, unknown>;

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

function priceRows(): Row[] {
  const rows: Row[] = [];
  for (const g of [...games, ...serverGames]) {
    for (const p of getPackages(g.id)) {
      if (p.price == null) continue;
      rows.push({ game_id: g.id, package_amt: `${p.amt} ${g.unit}`, game_name: g.name, price_usd: p.price, active: true });
    }
    for (const h of getHotItems(g.id)) {
      rows.push({ game_id: g.id, package_amt: `${h.label} ${g.unit}`, game_name: g.name, price_usd: h.price, active: true });
    }
  }
  return rows;
}

const customers = [
  { id: "u-1", email: "dara@example.com", display_name: "Dara", telegram: "@dara" },
  { id: "u-2", email: "sokha@example.com", display_name: "Sokha", telegram: null },
  { id: "u-3", email: "vanna@example.com", display_name: "Vanna", telegram: "@vanna" },
  { id: "u-4", email: "pisey@example.com", display_name: "Pisey", telegram: null },
];

function orderRows(): Row[] {
  const picks: [string, string, number][] = [
    ["mlbb", "86 Diamonds", 1.39],
    ["ff", "100 Diamonds", 0.99],
    ["mlbb", "172 Diamonds", 2.79],
    ["pubg", "60 UC", 0.99],
    ["mlbb", "Weekly Pass Diamonds", 1.55],
    ["ff", "310 Diamonds", 2.99],
    ["magicchess", "86 Diamonds", 1.39],
    ["mlbb", "257 Diamonds", 3.99],
    ["pubg", "325 UC", 4.79],
    ["ff", "520 Diamonds", 4.99],
    ["mlbb", "86 Diamonds", 1.39],
    ["bloodstrike", "320 Gold", 2.89],
  ];
  const statuses = ["completed", "completed", "processing", "completed", "pending", "completed", "completed", "cancelled", "completed", "processing", "completed", "completed"];
  return picks.map(([gameId, amt, price], i) => {
    const c = customers[i % customers.length]!;
    const guest = i % 3 === 2;
    const status = statuses[i] ?? "completed";
    const created = ago(i * 0.6 * DAY + i * 37 * 60_000);
    return {
      id: `${(0x3a7f1c00 + i * 0x2b3d7).toString(16)}-4c1e-4a2b-9d3f-${String(1000 + i).padStart(12, "0")}`,
      user_id: guest ? null : c.id,
      user_email: guest ? "" : c.email,
      game_id: gameId,
      game_name: findGame(gameId)?.name ?? gameId,
      package_amt: amt,
      price_usd: price,
      player_id: String(10234567 + i * 7919),
      player_zone: gameId === "mlbb" || gameId === "magicchess" ? String(2001 + i) : null,
      status,
      payment: "Bakong",
      created_at: created,
      paid_at: status === "pending" || status === "cancelled" ? null : created,
      supplier_order_id: status === "completed" ? `SUP-${50120 + i}` : null,
      supplier_status: status === "completed" ? "COMPLETED" : status === "processing" ? "PROCESSING" : null,
      payment_md5: null,
      delivery_codes: null,
    };
  });
}

export function seedTables(): Record<string, Row[]> {
  return {
    orders: orderRows(),
    profiles: customers.map((c, i) => ({ ...c, created_at: ago((i + 2) * 5 * DAY) })),
    product_prices: priceRows(),
    promo_codes: [
      { code: "DEMO10", percent: 10, max_uses: 50, used_count: 3, active: true, expires_at: null, created_at: ago(3 * DAY) },
      { code: "NEWYEAR", percent: 15, max_uses: 20, used_count: 20, active: true, expires_at: null, created_at: ago(30 * DAY) },
    ],
    store_settings: [{ id: 1, sales_open: true, hidden_games: [], updated_at: ago(DAY) }],
    site_images: [],
    package_offers: [],
  };
}

export function demoSupplierOrders(): SupplierOrder[] {
  return orderRows()
    .filter((o) => o["supplier_order_id"])
    .map((o) => ({
      id: String(o["supplier_order_id"]),
      status: "COMPLETED",
      game: String(o["game_name"]),
      product: String(o["package_amt"]),
      cost: Math.round(Number(o["price_usd"]) * 88) / 100,
      createdAt: String(o["created_at"]),
      image: null,
    }));
}
