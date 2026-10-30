import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  Search,
  Truck,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { DeliveryCell } from "@/components/AdminDelivery";
import { findGame } from "@/lib/games";
import { money } from "./AdminOverview";
import type { AdminOrder } from "./types";
import { useAdminT } from "./i18n";

const PAGE_SIZE = 10;
const STATUSES = ["pending", "processing", "completed", "failed", "refunded"] as const;

const STATUS_ICON: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  pending: { icon: Clock, color: "#FF9F43", bg: "rgba(255,159,67,0.16)" },
  processing: { icon: Truck, color: "#2F5FE0", bg: "rgba(47,95,224,0.14)" },
  completed: { icon: Check, color: "#28C76F", bg: "rgba(40,199,111,0.16)" },
  failed: { icon: AlertTriangle, color: "#FF4C51", bg: "rgba(255,76,81,0.16)" },
  refunded: { icon: Undo2, color: "#808390", bg: "rgba(128,131,144,0.16)" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GameIcon({ gameId, size = 28 }: { gameId: string; size?: number }) {
  const icon = findGame(gameId)?.icon;
  if (!icon) return null;
  return (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function StatusDot({ status }: { status: string }) {
  const { t } = useAdminT();
  const s = STATUS_ICON[status] ?? STATUS_ICON["refunded"]!;
  const Icon = s.icon;
  return (
    <span
      title={t(status)}
      aria-label={t(status)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
      style={{ color: s.color, background: s.bg }}
    >
      <Icon size={16} />
    </span>
  );
}

/** Page numbers around the current one, e.g. 1 2 3 4 5 of 12. */
function pageWindow(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  return Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
}

/**
 * The owner's order list: search, ten orders a page, a round status icon per order and
 * the status change and supplier delivery behind the eye button.
 */
export function AdminOrders({
  orders,
  updatingId,
  onStatus,
  onChanged,
}: {
  orders: AdminOrder[];
  updatingId: string | null;
  onStatus: (orderId: string, status: string) => void;
  onChanged: () => void;
}) {
  const { t } = useAdminT();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const shown = q
    ? orders.filter((o) =>
        [o.id, o.user_email, o.game_name, o.package_amt, o.player_id, o.status].some((v) =>
          v?.toLowerCase().includes(q),
        ),
      )
    : orders;
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const from = (current - 1) * PAGE_SIZE;
  const rows = shown.slice(from, from + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const statusSelect = (o: AdminOrder) => (
    <select
      value={o.status}
      disabled={updatingId === o.id}
      onChange={(e) => onStatus(o.id, e.target.value)}
      className="rounded-md border border-[var(--vx-border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--vx-primary)]"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(s)}
        </option>
      ))}
    </select>
  );

  const pagerBtn = (label: ReactNode, target: number, opts: { active?: boolean; title: string }) => (
    <button
      key={opts.title}
      onClick={() => setPage(target)}
      disabled={target < 1 || target > pages || target === current}
      title={opts.title}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] transition-colors ${
        opts.active
          ? "bg-[var(--vx-primary)] font-medium text-white"
          : "bg-[var(--vx-track)] text-[var(--vx-body)] hover:bg-[var(--vx-primary-soft)] disabled:opacity-40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="vx-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h5 className="text-lg font-medium">{t("Orders")}</h5>
          <p className="text-[13px] text-[var(--vx-muted)]">
            {shown.length} {t("orders")}
          </p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-md border border-[var(--vx-border)] px-3 py-1.5 focus-within:border-[var(--vx-primary)] sm:w-auto">
          <Search size={16} className="text-[var(--vx-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search order, email, player ID")}
            className="w-full bg-transparent text-[13px] outline-none sm:w-56"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="p-12 text-center text-[var(--vx-muted)]">
          <Inbox size={40} strokeWidth={1.5} className="mx-auto mb-3" />
          <p>{t("No orders yet")}</p>
        </div>
      ) : (
        <>
          {/* Phones: one card per order with its actions in view. */}
          <ul className="divide-y divide-[var(--vx-border)] border-t border-[var(--vx-border)] md:hidden">
            {rows.map((o) => (
              <li key={o.id} className="space-y-2 p-4">
                <div className="flex items-start gap-3">
                  <GameIcon gameId={o.game_id} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--vx-heading)]">{o.game_name}</p>
                    <p className="text-[13px]">{o.package_amt}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-semibold text-[var(--vx-heading)]">
                      {money(Number(o.price_usd))}
                    </p>
                    <StatusDot status={o.status} />
                  </div>
                </div>
                <p className="break-all font-mono text-xs">
                  {o.player_id}
                  {o.player_zone ? ` (${o.player_zone})` : ""}
                </p>
                <p className="flex flex-wrap gap-2 text-xs text-[var(--vx-muted)]">
                  <span className="font-medium text-[var(--vx-primary)]">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span>{fmtDate(o.created_at)}</span>
                  <span className="min-w-0 truncate">{o.user_email}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {statusSelect(o)}
                  <DeliveryCell order={o} onChanged={onChanged} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="vx-table w-full text-sm">
              <thead className="whitespace-nowrap border-y border-[var(--vx-border)] text-[12px] uppercase tracking-wide text-[var(--vx-muted)]">
                <tr className="text-left">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">{t("Game")}</th>
                  <th className="px-5 py-3 font-medium">{t("Player ID")}</th>
                  <th className="px-5 py-3 font-medium">{t("Customer")}</th>
                  <th className="px-5 py-3 font-medium">{t("Price")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("Status")}</th>
                  <th className="px-5 py-3 font-medium">{t("Date")}</th>
                  <th className="px-5 py-3 text-center font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vx-border)]">
                {rows.map((o) => {
                  const isOpen = open === o.id;
                  return (
                    <Fragment key={o.id}>
                      <tr className="transition-colors hover:bg-[var(--vx-hover)]">
                        <td className="px-5 py-3 text-[13px] font-medium text-[var(--vx-primary)]">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <GameIcon gameId={o.game_id} size={34} />
                            <div className="min-w-0">
                              <p className="whitespace-nowrap font-medium text-[var(--vx-heading)]">
                                {o.game_name}
                              </p>
                              <p className="whitespace-nowrap text-xs text-[var(--vx-muted)]">
                                {o.package_amt}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {o.player_id}
                          {o.player_zone ? ` (${o.player_zone})` : ""}
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3 text-xs">{o.user_email}</td>
                        <td className="px-5 py-3 font-medium text-[var(--vx-heading)]">
                          {money(Number(o.price_usd))}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusDot status={o.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-[var(--vx-muted)]">
                          {fmtDate(o.created_at)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => setOpen(isOpen ? null : o.id)}
                            title={isOpen ? t("Hide details") : t("Details")}
                            aria-expanded={isOpen}
                            className="rounded-md p-2 text-[var(--vx-muted)] hover:bg-[var(--vx-track)] hover:text-[var(--vx-heading)]"
                          >
                            {isOpen ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[var(--vx-hover)]">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="flex flex-wrap items-start gap-x-8 gap-y-3 text-[13px]">
                              <label className="flex items-center gap-2">
                                <span className="text-[var(--vx-muted)]">{t("Update")}</span>
                                {statusSelect(o)}
                              </label>
                              <div>
                                <DeliveryCell order={o} onChanged={onChanged} />
                              </div>
                              <p className="text-xs text-[var(--vx-muted)]">
                                {t("Order ID")}: <span className="font-mono">{o.id}</span>
                              </p>
                              {o.delivery_codes?.length ? (
                                <p className="text-xs">
                                  <span className="text-[var(--vx-muted)]">Code: </span>
                                  <span className="select-all font-mono font-semibold text-[var(--vx-heading)]">
                                    {o.delivery_codes.join(", ")}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--vx-border)] px-5 py-4">
            <p className="text-[13px] text-[var(--vx-muted)]">
              {t("Showing")} {from + 1} {t("to")} {from + rows.length} {t("of")} {shown.length}{" "}
              {t("entries")}
            </p>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                {pagerBtn(<ChevronsLeft size={15} />, 1, { title: "first" })}
                {pagerBtn(<ChevronLeft size={15} />, current - 1, { title: "prev" })}
                {pageWindow(current, pages).map((n) =>
                  pagerBtn(n, n, { active: n === current, title: `page ${n}` }),
                )}
                {pagerBtn(<ChevronRight size={15} />, current + 1, { title: "next" })}
                {pagerBtn(<ChevronsRight size={15} />, pages, { title: "last" })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
