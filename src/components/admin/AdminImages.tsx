import { useEffect, useRef, useState } from "react";
import { ImageUp, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SITE_IMAGES_BUCKET,
  cropToSize,
  imageSlots,
  loadSiteImages,
  setSiteImageOverride,
  siteImageOverrides,
  type ImageSlot,
} from "@/lib/site-images";
import { useAdminT } from "./i18n";

const GROUPS: { id: ImageSlot["group"]; label: string }[] = [
  { id: "banner", label: "Banner" },
  { id: "game", label: "Game icons" },
  { id: "item", label: "Pass and card pictures" },
];
const MAX_UPLOAD = 10 * 1024 * 1024;

// Owner-only picture editor. Any picture is cropped to the slot's size in the
// browser, stored in the site-images bucket and listed in public.site_images.
export function AdminImages() {
  const { t } = useAdminT();
  const [group, setGroup] = useState<ImageSlot["group"]>("banner");
  const [current, setCurrent] = useState<Record<string, string>>(siteImageOverrides());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void loadSiteImages(true).then(() => setCurrent(siteImageOverrides()));
  }, []);

  async function upload(slot: ImageSlot, file: File) {
    setMsg(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setMsg({ ok: false, text: t("Use a PNG, JPG or WebP picture") });
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setMsg({ ok: false, text: t("Picture is too big, max 10 MB") });
      return;
    }
    setBusy(slot.key);
    try {
      const blob = await cropToSize(file, slot.width, slot.height);
      const path = `${slot.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Date.now()}.webp`;
      const up = await supabase.storage
        .from(SITE_IMAGES_BUCKET)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (up.error) throw up.error;
      const url = supabase.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error } = await supabase
        .from("site_images")
        .upsert({ slot: slot.key, url, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSiteImageOverride(slot.key, url);
      setCurrent(siteImageOverrides());
      setMsg({ ok: true, text: `${t("Saved")}: ${t(slot.name)}` });
    } catch (error) {
      setMsg({
        ok: false,
        text: `${t("Couldn't save the picture")}: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(null);
    }
  }

  async function reset(slot: ImageSlot) {
    setMsg(null);
    setBusy(slot.key);
    const { error } = await supabase.from("site_images").delete().eq("slot", slot.key);
    setBusy(null);
    if (error) {
      setMsg({ ok: false, text: `${t("Couldn't save the picture")}: ${error.message}` });
      return;
    }
    setSiteImageOverride(slot.key, null);
    setCurrent(siteImageOverrides());
    setMsg({ ok: true, text: `${t("Back to the original")}: ${t(slot.name)}` });
  }

  const slots = imageSlots.filter((s) => s.group === group);

  return (
    <div className="vx-card overflow-hidden">
      <div className="p-6 pb-4">
        <h5 className="text-lg font-medium">{t("Images")}</h5>
        <p className="mt-1 text-[13px] text-[var(--vx-muted)]">
          {t("Pick any picture. It is cut to the size shown, so it always fits")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                group === g.id
                  ? "vx-btn"
                  : "border border-[var(--vx-border)] text-[var(--vx-muted)]"
              }`}
            >
              {t(g.label)}
            </button>
          ))}
        </div>
        {msg && (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-[13px] ${
              msg.ok ? "bg-[#28C76F29] text-[#1B8A4C]" : "bg-[#FF4C5129] text-[#C7363B]"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>
      <div
        className={`grid gap-4 px-6 pb-6 ${
          group === "banner"
            ? "grid-cols-1"
            : group === "game"
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {slots.map((slot) => (
          <SlotCard
            key={slot.key}
            slot={slot}
            src={current[slot.key] ?? slot.fallback}
            changed={!!current[slot.key]}
            busy={busy === slot.key}
            disabled={busy !== null}
            onPick={(f) => void upload(slot, f)}
            onReset={() => void reset(slot)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  src,
  changed,
  busy,
  disabled,
  onPick,
  onReset,
}: {
  slot: ImageSlot;
  src: string;
  changed: boolean;
  busy: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
  onReset: () => void;
}) {
  const { t } = useAdminT();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col rounded-lg border border-[var(--vx-border)] p-3">
      <div
        className="overflow-hidden rounded-md bg-[var(--vx-track)]"
        style={{ aspectRatio: `${slot.width} / ${slot.height}` }}
      >
        <img
          src={src}
          alt={slot.name}
          className={`h-full w-full object-cover ${busy ? "opacity-40" : ""}`}
        />
      </div>
      <p className="mt-2 truncate text-[14px] font-medium text-[var(--vx-heading)]">
        {t(slot.name)}
      </p>
      <p className="text-[12px] text-[var(--vx-muted)]">
        {t("Size")} {slot.width} x {slot.height} px
        {changed && <span className="ml-1 text-[#28C76F]">· {t("New picture")}</span>}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPick(f);
          }}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={disabled}
          className="vx-btn inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-medium disabled:opacity-50"
        >
          <ImageUp size={15} />
          {busy ? t("Saving…") : t("Change picture")}
        </button>
        {changed && (
          <button
            onClick={onReset}
            disabled={disabled}
            aria-label={t("Use the original")}
            title={t("Use the original")}
            className="rounded-md border border-[var(--vx-border)] px-2 text-[var(--vx-muted)] hover:text-[var(--vx-heading)] disabled:opacity-50"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
