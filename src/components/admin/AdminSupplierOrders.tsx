import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { getSupplierOrders } from "@/lib/delivery.functions";
import type { SupplierOrders } from "@/lib/delivery.server";
import { findGame } from "@/lib/games";
import type { AdminOrder } from "./types";
import { useAdminT } from "./i18n";

// FazerCards bills to a tenth of a cent ($0.388), so small amounts keep three decimals.
const money = (n: number) => `$${n.toFixed(Math.abs(n) < 1 ? 3 : 2)}`;
const PANEL_URL = "https://reseller.fazercards.com/panel/orders";

/**
 * The newest FazerCards orders next to the store order each one delivered,
 * so the owner sees the real supplier cost and profit of every sale.
 */
export function AdminSupplierOrders({ orders }: { orders: AdminOrder[] }) {
  const { t, lang } = useAdminT();
  const [data, setData] = useState<SupplierOrders | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getSupplierOrders());
    } catch (error) {
      setData({
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sales = new Map(
    orders
      .filter((o) => o.supplier_order_id)
      .map((o): [string, AdminOrder] => [o.supplier_order_id!, o]),
  );
  const list = data?.ok ? data.orders : [];
  const done = list.filter((f) => f.status === "completed");
  const spent = done.reduce((s, f) => s + f.cost, 0);
  const profit = done.reduce((s, f) => {
    const sale = sales.get(f.id);
    return sale ? s + Number(sale.price_usd) - f.cost : s;
  }, 0);
  const waiting = list.filter((f) => f.status === "processing").length;
  const locale = lang === "km" ? "km-KH" : "en-GB";

  const tiles = [
    { label: t("Spent at FazerCards"), value: money(spent), color: "#3FA2F0" },
    { label: t("Real profit"), value: money(profit), color: profit < 0 ? "#FF4C51" : "#28C76F" },
    { label: t("Still processing"), value: String(waiting), color: "#FF9F43" },
  ];

  return (
    <div className="vx-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
        <div>
          <h5 className="text-lg font-medium leading-tight">{t("FazerCards orders")}</h5>
          <p className="mt-0.5 text-[13px] text-[var(--vx-muted)]">
            {t("Newest orders at FazerCards, with the real cost")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={PANEL_URL}
            target="_blank"
            rel="noreferrer"
            className="vx-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
          >
            {t("Open FazerCards")}
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => void load()}
            disabled={loading}
            aria-label={t("Refresh")}
            className="rounded-md border border-[var(--vx-border)] p-2 text-[var(--vx-muted)] hover:text-[var(--vx-heading)] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {data && !data.ok && (
        <div className="mx-6 mt-4 rounded-md bg-[#FF9F4329] px-3 py-2 text-[13px] text-[#B8661A]">
          <p className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {data.reason === "no_key"
              ? t("FazerCards API key is not set")
              : t("Couldn't read FazerCards orders, try Refresh")}
          </p>
          {data.reason === "error" && data.message && (
            <p className="mt-1 break-words pl-6 font-mono text-[12px]">{data.message.slice(0, 300)}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-md border border-[var(--vx-border)] px-4 py-3">
            <p className="text-[13px] text-[var(--vx-muted)]">{x.label}</p>
            <h4 className="text-xl font-medium" style={{ color: x.color }}>
              {x.value}
            </h4>
          </div>
        ))}
      </div>

      {data?.ok && list.length === 0 && (
        <p className="px-6 pb-6 text-[13px] text-[var(--vx-muted)]">{t("No FazerCards orders yet")}</p>
      )}

      <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-2">
        {list.map((f) => {
          const sale = sales.get(f.id);
          // The API list has no pictures, so the store's own game icon stands in.
          const image = f.image ?? findGame(sale?.game_id)?.icon ?? null;
          const icon =
            f.status === "completed" ? (
              <CheckCircle2 size={18} className="text-[#28C76F]" />
            ) : f.status === "processing" ? (
              <Clock size={18} className="text-[#FF9F43]" />
            ) : (
              <XCircle size={18} className="text-[#FF4C51]" />
            );
          return (
            <div
              key={f.id}
              className="flex gap-3 rounded-md border border-[var(--vx-border)] p-3"
            >
              {image ? (
                <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 rounded-md bg-[var(--vx-border)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-[var(--vx-heading)]">{f.id}</p>
                  <p className="font-medium text-[var(--vx-heading)]">{money(f.cost)}</p>
                </div>
                <p className="truncate text-[13px] text-[var(--vx-muted)]">
                  {[f.game, f.product, sale?.player_id].filter(Boolean).join(" • ")}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                  {icon}
                  <span className="rounded bg-[var(--vx-border)] px-2 py-0.5 text-[var(--vx-muted)]">
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleString(locale, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  {sale ? (
                    <span className="text-[var(--vx-muted)]">
                      {t("Sold")} {money(Number(sale.price_usd))} ·{" "}
                      <span
                        className={
                          Number(sale.price_usd) - f.cost < 0 ? "text-[#FF4C51]" : "text-[#28C76F]"
                        }
                      >
                        {t("Profit")} {money(Number(sale.price_usd) - f.cost)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--vx-muted)]">{t("Not from the store")}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
