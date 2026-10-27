import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, ExternalLink, RefreshCw, Truck, Wallet } from "lucide-react";
import { getSupplierStock } from "@/lib/delivery.functions";
import type { SupplierStock } from "@/lib/delivery.server";
import type { AdminOrder } from "./types";
import { useAdminT } from "./i18n";

const money = (n: number) => `$${n.toFixed(2)}`;
const LOW_BALANCE = 5;
const TOPUP_URL = "https://reseller.fazercards.com/panel/balance";

/**
 * FazerCards balance next to what the paid, not yet delivered orders will cost,
 * so the owner sees when to top up before auto delivery starts failing.
 */
export function AdminStock({
  orders,
  orderCost,
}: {
  orders: AdminOrder[];
  orderCost: (o: AdminOrder) => number | null;
}) {
  const { t, lang } = useAdminT();
  const [stock, setStock] = useState<SupplierStock | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStock(await getSupplierStock());
    } catch (error) {
      setStock({
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

  const waiting = orders.filter(
    (o) => o.status === "processing" || (o.status === "pending" && o.paid_at),
  );
  const needed = waiting.reduce((s, o) => s + (orderCost(o) ?? 0), 0);
  const balance = stock?.ok ? stock.balance : null;
  const short = balance !== null && balance < needed ? needed - balance : 0;
  const low = balance !== null && (short > 0 || balance < LOW_BALANCE);

  const expires = stock?.ok && stock.planExpiresAt ? new Date(stock.planExpiresAt) : null;
  const daysLeft = expires ? Math.ceil((expires.getTime() - Date.now()) / 86_400_000) : null;
  const locale = lang === "km" ? "km-KH" : "en-GB";

  const tiles = [
    {
      label: t("FazerCards balance"),
      value: balance === null ? "—" : money(balance),
      sub: balance === null ? "—" : low ? t("Low, please top up") : t("Ready for auto delivery"),
      icon: <Wallet size={20} />,
      color: balance === null ? "#7A86A3" : low ? "#FF4C51" : "#28C76F",
    },
    {
      label: t("Orders waiting"),
      value: money(needed),
      sub: `${waiting.length} ${t("orders to deliver")}`,
      icon: <Truck size={20} />,
      color: "#3FA2F0",
    },
    {
      label: t("Plan"),
      value: stock?.ok ? (stock.plan ?? "—") : "—",
      sub:
        daysLeft === null
          ? "—"
          : daysLeft <= 0
            ? t("Expired")
            : `${t("Ends")} ${expires!.toLocaleDateString(locale, { day: "numeric", month: "short" })} (${daysLeft} ${t("days")})`,
      icon: <CalendarClock size={20} />,
      color: daysLeft !== null && daysLeft <= 3 ? "#FF9F43" : "#2F5FE0",
    },
  ];

  return (
    <div className="vx-card lg:col-span-12">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
        <div>
          <h5 className="text-lg font-medium leading-tight">{t("Stock")}</h5>
          <p className="mt-0.5 text-[13px] text-[var(--vx-muted)]">
            {t("FazerCards money for auto delivery")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={TOPUP_URL}
            target="_blank"
            rel="noreferrer"
            className="vx-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
          >
            {t("Top up")}
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

      {stock && !stock.ok && (
        <p className="mx-6 mt-4 flex items-center gap-2 rounded-md bg-[#FF9F4329] px-3 py-2 text-[13px] text-[#B8661A]">
          <AlertTriangle size={16} />
          {stock.reason === "no_key"
            ? t("FazerCards API key is not set")
            : t("Couldn't read FazerCards, try Refresh")}
        </p>
      )}
      {short > 0 && (
        <p className="mx-6 mt-4 flex items-center gap-2 rounded-md bg-[#FF4C5129] px-3 py-2 text-[13px] text-[#C7363B]">
          <AlertTriangle size={16} />
          {t("Add at least")} {money(short)} {t("to deliver all waiting orders")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="flex items-center gap-4">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              style={{ color: x.color, background: `${x.color}29` }}
            >
              {x.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--vx-muted)]">{x.label}</p>
              <h4 className="text-xl font-medium text-[var(--vx-heading)]">{x.value}</h4>
              <p className="text-[12px] text-[var(--vx-muted)]">{x.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
