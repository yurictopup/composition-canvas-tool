const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: "#FF9F43", bg: "rgba(255,159,67,0.16)" },
  processing: { color: "#2F5FE0", bg: "rgba(47,95,224,0.14)" },
  completed: { color: "#28C76F", bg: "rgba(40,199,111,0.16)" },
  failed: { color: "#FF4C51", bg: "rgba(255,76,81,0.16)" },
  refunded: { color: "#808390", bg: "rgba(128,131,144,0.16)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE["refunded"]!;
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[13px] font-medium capitalize"
      style={{ color: s.color, background: s.bg }}
    >
      {status}
    </span>
  );
}
