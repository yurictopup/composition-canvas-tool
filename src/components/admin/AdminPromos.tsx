import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminT } from "@/components/admin/i18n";
import { PROMO_CODE } from "@/lib/promo";

// Owner-only promo codes: percent off one package, a total use limit and an end
// date. The database applies them and never lets a price fall below cost.
type Promo = {
  code: string;
  percent_off: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

function status(p: Promo): "active" | "off" | "expired" | "used up" {
  if (!p.active) return "off";
  if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return "expired";
  if (p.max_uses !== null && p.used_count >= p.max_uses) return "used up";
  return "active";
}

export function AdminPromos() {
  const { t } = useAdminT();
  const [rows, setRows] = useState<Promo[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("50");
  const [ends, setEnds] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMsg({ ok: false, text: `${t("Couldn't load promo codes")}: ${error.message}` });
    setRows((data as Promo[] | null) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    const c = code.trim().toUpperCase();
    const pct = Number(percent);
    const uses = maxUses.trim() ? Number(maxUses) : null;
    if (!PROMO_CODE.test(c)) {
      setMsg({ ok: false, text: t("Code: 3-20 letters or numbers, no spaces") });
      return;
    }
    if (!Number.isInteger(pct) || pct < 1 || pct > 50) {
      setMsg({ ok: false, text: t("Percent off: a whole number from 1 to 50") });
      return;
    }
    if (uses !== null && (!Number.isInteger(uses) || uses < 1)) {
      setMsg({ ok: false, text: t("Use limit: a whole number, or empty for no limit") });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: c,
      percent_off: pct,
      max_uses: uses,
      // End of the chosen day, Cambodia time.
      expires_at: ends ? new Date(`${ends}T23:59:59+07:00`).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      setMsg({
        ok: false,
        text: error.code === "23505" ? t("This code already exists") : error.message,
      });
      return;
    }
    setMsg({ ok: true, text: `${t("Saved")}: ${c}` });
    setCode("");
    await load();
  }

  async function toggle(p: Promo) {
    const { error } = await supabase
      .from("promo_codes")
      .update({ active: !p.active })
      .eq("code", p.code);
    if (error) setMsg({ ok: false, text: error.message });
    await load();
  }

  async function remove(p: Promo) {
    if (!window.confirm(`${t("Delete promo code")} ${p.code}?`)) return;
    const { error } = await supabase.from("promo_codes").delete().eq("code", p.code);
    if (error) setMsg({ ok: false, text: error.message });
    await load();
  }

  const input =
    "rounded-md border border-[var(--vx-border)] bg-[var(--vx-card)] px-3 py-2 text-[14px] text-[var(--vx-heading)]";

  return (
    <div className="vx-card overflow-hidden">
      <div className="p-6 pb-4">
        <h5 className="text-lg font-medium">{t("Promo codes")}</h5>
        <p className="mt-1 text-[13px] text-[var(--vx-muted)]">
          {t(
            "Customers type the code on the game page. The discount never makes a package cheaper than its FazerCards cost (+2¢); packages without a known cost get no discount.",
          )}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-[13px] text-[var(--vx-body)]">
            {t("Code")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              maxLength={20}
              placeholder="YURIC10"
              className={`${input} font-mono uppercase tracking-wider`}
            />
          </label>
          <label className="grid gap-1 text-[13px] text-[var(--vx-body)]">
            {t("Percent off")}
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              inputMode="numeric"
              className={input}
            />
          </label>
          <label className="grid gap-1 text-[13px] text-[var(--vx-body)]">
            {t("Use limit")}
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              inputMode="numeric"
              placeholder={t("No limit")}
              className={input}
            />
          </label>
          <label className="grid gap-1 text-[13px] text-[var(--vx-body)]">
            {t("Ends on")}
            <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className={input} />
          </label>
          <button onClick={() => void add()} disabled={saving} className="vx-btn rounded-md px-4 py-2 text-[14px]">
            {saving ? t("Saving…") : t("Add code")}
          </button>
        </div>
        {msg && (
          <p className={`mt-3 text-[13px] ${msg.ok ? "text-[#28C76F]" : "text-[#EA5455]"}`}>{msg.text}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead className="border-y border-[var(--vx-border)] text-[12px] uppercase text-[var(--vx-muted)]">
            <tr>
              <th className="px-6 py-3">{t("Code")}</th>
              <th className="px-3 py-3">{t("Percent off")}</th>
              <th className="px-3 py-3">{t("Used")}</th>
              <th className="px-3 py-3">{t("Ends on")}</th>
              <th className="px-3 py-3">{t("Status")}</th>
              <th className="px-6 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-[var(--vx-muted)]">
                  {t("Loading…")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-[var(--vx-muted)]">
                  {t("No promo codes yet")}
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const s = status(p);
                return (
                  <tr key={p.code} className="border-b border-[var(--vx-border)]">
                    <td className="px-6 py-3 font-mono font-semibold tracking-wider text-[var(--vx-heading)]">
                      {p.code}
                    </td>
                    <td className="px-3 py-3">{p.percent_off}%</td>
                    <td className="px-3 py-3">
                      {p.used_count}
                      {p.max_uses !== null ? ` / ${p.max_uses}` : ""}
                    </td>
                    <td className="px-3 py-3">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                          s === "active"
                            ? "bg-[#28C76F]/15 text-[#28C76F]"
                            : "bg-[var(--vx-border)] text-[var(--vx-muted)]"
                        }`}
                      >
                        {t(s)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => void toggle(p)}
                        className="mr-3 text-[13px] font-medium text-[var(--vx-primary,#7367F0)] hover:underline"
                      >
                        {p.active ? t("Switch off") : t("Switch on")}
                      </button>
                      <button
                        onClick={() => void remove(p)}
                        className="text-[13px] font-medium text-[#EA5455] hover:underline"
                      >
                        {t("Delete")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
