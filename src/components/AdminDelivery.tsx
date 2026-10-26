import { useState } from "react";
import { deliverOrder, refreshDelivery } from "@/lib/delivery.functions";

// One order's GamesDrop delivery controls on the admin Orders tab.
export function DeliveryCell({
  order,
  onChanged,
}: {
  order: {
    id: string;
    status: string;
    supplier_order_id?: string | null;
    supplier_status?: string | null;
  };
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canDeliver =
    (order.status === "pending" || order.status === "processing") && !order.supplier_order_id;
  const canRefresh = order.status === "processing" && !!order.supplier_order_id;

  async function run(action: "deliver" | "refresh") {
    if (
      action === "deliver" &&
      !window.confirm("Buy this package from GamesDrop now? It uses your GamesDrop balance.")
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fn = action === "deliver" ? deliverOrder : refreshDelivery;
      const res = await fn({ data: { orderId: order.id } });
      setMsg(res.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="grid gap-1 text-xs">
      {canDeliver && (
        <button
          disabled={busy}
          onClick={() => run("deliver")}
          className="rounded-lg bg-[#1a0a2e] px-3 py-1.5 font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Sending…" : "🚀 Deliver"}
        </button>
      )}
      {canRefresh && (
        <button
          disabled={busy}
          onClick={() => run("refresh")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          {busy ? "Checking…" : "↻ Check"}
        </button>
      )}
      {order.supplier_status && (
        <span className="text-gray-400">GamesDrop: {order.supplier_status}</span>
      )}
      {msg && <span className="max-w-[200px] text-gray-600">{msg}</span>}
    </div>
  );
}
