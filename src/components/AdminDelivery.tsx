import { useState } from "react";
import { deliverOrder, refreshDelivery } from "@/lib/delivery.functions";
import { checkPayment } from "@/lib/payment.functions";
import { useAdminT } from "@/components/admin/i18n";

// One order's supplier delivery controls on the admin Orders tab.
export function DeliveryCell({
  order,
  onChanged,
}: {
  order: {
    id: string;
    status: string;
    supplier_order_id?: string | null;
    supplier_status?: string | null;
    payment_md5?: string | null;
    paid_at?: string | null;
  };
  onChanged: () => void;
}) {
  const { t } = useAdminT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Being bought right now: no second click.
  const placing = order.supplier_status === "PLACING";
  // The last buy got no answer, so FazerCards may already have it: the owner checks first.
  const inDoubt = order.supplier_status === "UNKNOWN" || order.supplier_status === "UNCONFIRMED";
  const canDeliver =
    (order.status === "pending" || order.status === "processing") &&
    !order.supplier_order_id &&
    !placing;
  const canRefresh = order.status === "processing" && !!order.supplier_order_id;
  const canCheckPayment = order.status === "pending" && !!order.payment_md5 && !order.paid_at;

  async function runPaymentCheck() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await checkPayment({ data: { orderId: order.id } });
      setMsg(res.paid ? t("Paid.") : (res.message ?? t("Not paid yet.")));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("Something went wrong."));
    }
    setBusy(false);
    onChanged();
  }

  async function run(action: "deliver" | "refresh") {
    const unpaid = !order.paid_at;
    if (
      action === "deliver" &&
      !window.confirm(
        inDoubt
          ? t(
              "FazerCards may already have this order (the last try got no answer). Open the FazerCards panel > Orders first. Only continue if this order is NOT there. Buy it again now?",
            )
          : unpaid
            ? t(
                "Bakong has NOT confirmed this order is paid. Only continue if the customer paid you another way. Buy it from FazerCards now?",
              )
            : t("Buy this package from FazerCards now? It uses your FazerCards balance."),
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res =
        action === "deliver"
          ? await deliverOrder({
              data: { orderId: order.id, allowUnpaid: unpaid, confirmedNotPlaced: inDoubt },
            })
          : await refreshDelivery({ data: { orderId: order.id } });
      setMsg(res.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("Something went wrong."));
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="grid gap-1 whitespace-nowrap text-xs">
      {order.paid_at && <span className="font-semibold text-green-700">{t("Paid by Bakong")}</span>}
      {canCheckPayment && (
        <button
          disabled={busy}
          onClick={runPaymentCheck}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          {busy ? t("Checking…") : t("Check payment")}
        </button>
      )}
      {canDeliver && (
        <button
          disabled={busy}
          onClick={() => run("deliver")}
          className="rounded-lg bg-[#1C3CB2] px-3 py-1.5 font-semibold text-white disabled:opacity-40"
        >
          {busy ? t("Sending…") : inDoubt ? t("Buy again (check first)") : t("Deliver")}
        </button>
      )}
      {canRefresh && (
        <button
          disabled={busy}
          onClick={() => run("refresh")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          {busy ? t("Checking…") : t("Check delivery")}
        </button>
      )}
      {order.supplier_status && (
        <span className="text-gray-400">
          {t("Supplier")}: {order.supplier_status}
        </span>
      )}
      {msg && <span className="max-w-[200px] text-gray-600">{msg}</span>}
    </div>
  );
}
