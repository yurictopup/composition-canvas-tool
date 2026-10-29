import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, paid } from "./AdminOverview";
import type { AdminOrder } from "./types";
import { useAdminT } from "./i18n";

type Account = {
  id: string;
  email: string;
  display_name: string | null;
  telegram: string | null;
  created_at: string;
};

type Row = {
  key: string;
  email: string;
  detail: string;
  signedUp: string | null;
  orders: AdminOrder[];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Every registered account (public.profiles, owner-only by RLS) with its orders in the
 * selected period, plus guests who bought without an account.
 */
export function AdminCustomers({ orders }: { orders: AdminOrder[] }) {
  const { t } = useAdminT();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, telegram, created_at")
      .order("created_at", { ascending: false });
    setFailed(!!error);
    if (data) setAccounts(data as Account[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byUser = new Map<string, AdminOrder[]>();
  const guests = new Map<string, AdminOrder[]>();
  for (const o of orders) {
    const key = o.user_id ?? null;
    const map = key ? byUser : guests;
    const id = key ?? (o.user_email || "Guest");
    map.set(id, [...(map.get(id) ?? []), o]);
  }

  const rows: Row[] = [
    ...(accounts ?? []).map((a) => ({
      key: a.id,
      email: a.email,
      detail: [a.display_name, a.telegram && `Telegram ${a.telegram}`].filter(Boolean).join(" · "),
      signedUp: a.created_at,
      orders: byUser.get(a.id) ?? [],
    })),
    ...[...guests].map(([email, list]) => ({
      key: `guest:${email}`,
      email,
      detail: t("Guest checkout"),
      signedUp: null,
      orders: list,
    })),
  ];
  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) => [r.email, r.detail].some((v) => v.toLowerCase().includes(q)))
    : rows;
  const buyers = rows.filter((r) => r.orders.some(paid)).length;

  const stats = (r: Row) => {
    const spent = r.orders.filter(paid).reduce((s, o) => s + Number(o.price_usd), 0);
    // Orders arrive newest first.
    const last = r.orders[0]?.created_at;
    return { count: r.orders.length, spent, last };
  };

  const avatar = (email: string) => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--vx-primary-soft)] text-xs font-semibold uppercase text-[var(--vx-primary)]">
      {email.slice(0, 2)}
    </span>
  );

  return (
    <div className="vx-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h5 className="text-lg font-medium">{t("Customers")}</h5>
          <p className="text-[13px] text-[var(--vx-muted)]">
            {accounts?.length ?? 0} {t("registered")} · {buyers} {t("bought")}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="flex flex-1 items-center gap-2 rounded-md border border-[var(--vx-border)] px-3 py-1.5 focus-within:border-[var(--vx-primary)]">
            <Search size={16} className="text-[var(--vx-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search email")}
              className="w-full bg-transparent text-[13px] outline-none sm:w-48"
            />
          </label>
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

      {failed && (
        <p className="mx-6 mb-4 flex items-center gap-2 rounded-md bg-[#FF9F4329] px-3 py-2 text-[13px] text-[#B8661A]">
          <AlertTriangle size={16} />
          {t("Couldn't load accounts, try Refresh")}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="p-12 text-center text-[var(--vx-muted)]">
          <Users size={40} strokeWidth={1.5} className="mx-auto mb-3" />
          <p>{t("No customers yet")}</p>
        </div>
      ) : (
        <>
          {/* Phones: one card per customer. */}
          <ul className="divide-y divide-[var(--vx-border)] border-t border-[var(--vx-border)] md:hidden">
            {shown.map((r) => {
              const s = stats(r);
              return (
                <li key={r.key} className="flex items-start gap-3 p-4">
                  {avatar(r.email)}
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium text-[var(--vx-heading)]">{r.email}</p>
                    {r.detail && <p className="text-xs text-[var(--vx-muted)]">{r.detail}</p>}
                    <p className="mt-1 text-xs text-[var(--vx-muted)]">
                      {r.signedUp ? `${t("Signed up")} ${fmtDate(r.signedUp)} · ` : ""}
                      {s.count} {t("orders")}
                      {s.last ? ` · ${t("Last Order")} ${fmtDate(s.last)}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--vx-heading)]">{money(s.spent)}</p>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="vx-table w-full text-sm">
              <thead className="border-y border-[var(--vx-border)]">
                <tr className="text-left">
                  <th className="px-6 py-3">{t("Customer")}</th>
                  <th className="px-6 py-3">{t("Signed up")}</th>
                  <th className="px-6 py-3">{t("Total Orders")}</th>
                  <th className="px-6 py-3">{t("Total Spent")}</th>
                  <th className="px-6 py-3">{t("Last Order")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vx-border)]">
                {shown.map((r) => {
                  const s = stats(r);
                  return (
                    <tr key={r.key} className="transition-colors hover:bg-[var(--vx-hover)]">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {avatar(r.email)}
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--vx-heading)]">{r.email}</p>
                            {r.detail && (
                              <p className="text-xs text-[var(--vx-muted)]">{r.detail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">
                        {r.signedUp ? fmtDate(r.signedUp) : "—"}
                      </td>
                      <td className="px-6 py-3">{s.count}</td>
                      <td className="px-6 py-3 font-medium text-[var(--vx-heading)]">
                        {money(s.spent)}
                      </td>
                      <td className="px-6 py-3 text-xs text-[var(--vx-muted)]">
                        {s.last ? fmtDate(s.last) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
