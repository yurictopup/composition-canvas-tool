import { useMemo } from "react";
import { qrcodegen } from "@/lib/vendor/qrcodegen";

// Draws a KHQR string as an SVG QR code (no image service involved).
export function KhqrCode({ value, size = 240 }: { value: string; size?: number }) {
  const path = useMemo(() => {
    const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM);
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) parts.push(`M${x + 4},${y + 4}h1v1h-1z`);
      }
    }
    return { d: parts.join(""), size: qr.size + 8 };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label="KHQR payment code"
      viewBox={`0 0 ${path.size} ${path.size}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-xl bg-white"
    >
      <rect width={path.size} height={path.size} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}
