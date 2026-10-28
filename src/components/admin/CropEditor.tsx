import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize, Minimize, Move, X, ZoomIn, ZoomOut } from "lucide-react";
import type { CropPlacement } from "@/lib/site-images";
import { useAdminT } from "./i18n";

type Props = {
  file: File;
  name: string;
  width: number;
  height: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (placement: CropPlacement) => void;
};

const MAX_ZOOM = 4;

// Lets the owner place a picture in a slot before it is saved: drag to move, the slider or
// mouse wheel to zoom. Everything is kept in output pixels (the slot's own size), and the
// frame on screen is just that size scaled down.
export function CropEditor({ file, name, width, height, saving, onCancel, onSave }: Props) {
  const { t } = useAdminT();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState(0);
  const [place, setPlace] = useState<CropPlacement>({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView(el.clientWidth));
    ro.observe(el);
    setView(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  const cover = natural ? Math.max(width / natural.w, height / natural.h) : 1;
  const contain = natural ? Math.min(width / natural.w, height / natural.h) : 1;
  const minZoom = Math.min(cover, contain);
  const maxZoom = cover * MAX_ZOOM;
  const k = view / width;

  // Keeps the picture over the frame: a side bigger than the frame can't leave a gap,
  // a smaller side stays inside it.
  function clamp(p: CropPlacement): CropPlacement {
    if (!natural) return p;
    const w = natural.w * p.scale;
    const h = natural.h * p.scale;
    const fit = (pos: number, size: number, box: number) =>
      size >= box ? Math.min(0, Math.max(box - size, pos)) : Math.max(0, Math.min(box - size, pos));
    return { scale: p.scale, x: fit(p.x, w, width), y: fit(p.y, h, height) };
  }

  function centred(scale: number): CropPlacement {
    if (!natural) return place;
    return { scale, x: (width - natural.w * scale) / 2, y: (height - natural.h * scale) / 2 };
  }

  // Zooms around a point of the frame (output pixels), so that point stays put.
  function zoomTo(scale: number, cx = width / 2, cy = height / 2) {
    const s = Math.min(maxZoom, Math.max(minZoom, scale));
    setPlace((p) =>
      clamp({ scale: s, x: cx - ((cx - p.x) * s) / p.scale, y: cy - ((cy - p.y) * s) / p.scale }),
    );
  }

  // Slider runs 0..100 on a log scale so small and large pictures zoom evenly.
  const span = Math.log(maxZoom / minZoom) || 1;
  const sliderValue = Math.round((Math.log(place.scale / minZoom) / span) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(7_20_50/0.6)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("Place the picture")}
    >
      <div className="vx-card flex max-h-full w-full max-w-[640px] flex-col overflow-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h5 className="text-lg font-medium">{t("Place the picture")}</h5>
            <p className="truncate text-[13px] text-[var(--vx-muted)]">
              {t(name)} · {width} x {height} px
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            aria-label={t("Cancel")}
            className="rounded-md p-1 text-[var(--vx-muted)] hover:text-[var(--vx-heading)]"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={frame}
          className="crop-checker relative cursor-grab active:cursor-grabbing mx-auto mt-4 w-full touch-none select-none overflow-hidden rounded-md ring-1 ring-[var(--vx-border)]"
          style={{
            aspectRatio: `${width} / ${height}`,
            maxWidth: `min(100%, ${Math.round((width / height) * 420)}px)`,
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId || !k) return;
            const dx = (e.clientX - d.x) / k;
            const dy = (e.clientY - d.y) / k;
            drag.current = { ...d, x: e.clientX, y: e.clientY };
            setPlace((p) => clamp({ ...p, x: p.x + dx, y: p.y + dy }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => {
            if (!k) return;
            const r = e.currentTarget.getBoundingClientRect();
            zoomTo(
              place.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08),
              (e.clientX - r.left) / k,
              (e.clientY - r.top) / k,
            );
          }}
        >
          {url && (
            <img
              src={url}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const n = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
                setNatural(n);
                const s = Math.max(width / n.w, height / n.h);
                setPlace({ scale: s, x: (width - n.w * s) / 2, y: (height - n.h * s) / 2 });
              }}
              className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
              style={
                natural
                  ? {
                      width: natural.w * place.scale * k,
                      height: natural.h * place.scale * k,
                      transform: `translate(${place.x * k}px, ${place.y * k}px)`,
                    }
                  : { opacity: 0 }
              }
            />
          )}
          {/* Rule-of-thirds guide */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border border-white/25" />
            ))}
          </div>
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-[var(--vx-muted)]">
          <Move size={13} /> {t("Drag to move, zoom to make it bigger or smaller")}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => zoomTo(place.scale / 1.2)}
            aria-label={t("Zoom out")}
            className="rounded-md border border-[var(--vx-border)] p-1.5 text-[var(--vx-body)]"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Number.isFinite(sliderValue) ? sliderValue : 0}
            onChange={(e) => zoomTo(minZoom * Math.exp((Number(e.target.value) / 100) * span))}
            aria-label={t("Zoom")}
            className="h-1.5 flex-1 accent-[var(--vx-primary)]"
          />
          <button
            onClick={() => zoomTo(place.scale * 1.2)}
            aria-label={t("Zoom in")}
            className="rounded-md border border-[var(--vx-border)] p-1.5 text-[var(--vx-body)]"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setPlace(centred(cover))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--vx-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--vx-body)] hover:bg-[var(--vx-hover)]"
          >
            <Maximize size={14} /> {t("Fill the frame")}
          </button>
          <button
            onClick={() => setPlace(centred(contain))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--vx-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--vx-body)] hover:bg-[var(--vx-hover)]"
          >
            <Minimize size={14} /> {t("Show whole picture")}
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-[var(--vx-border)] px-4 py-2 text-[13px] font-medium text-[var(--vx-body)] disabled:opacity-50"
          >
            {t("Cancel")}
          </button>
          <button
            onClick={() => onSave(place)}
            disabled={!natural || saving}
            className="vx-btn px-4 py-2 text-[13px] font-medium disabled:opacity-50"
          >
            {saving ? t("Saving…") : t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
