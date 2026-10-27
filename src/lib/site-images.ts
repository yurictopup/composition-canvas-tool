import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import banner from "@/assets/banner-angkor.png";
import { games, hotItemsByGame } from "@/lib/games";

// Pictures the owner can replace from /admin. Each slot has a built-in picture;
// an uploaded one (public.site_images + the site-images bucket) is shown instead.

export type ImageSlot = {
  key: string;
  group: "banner" | "game" | "item";
  name: string;
  fallback: string;
  /** Size the upload is cropped to, in pixels. */
  width: number;
  height: number;
};

export const SITE_IMAGES_BUCKET = "site-images";

function itemSlots(): ImageSlot[] {
  const seen = new Map<string, ImageSlot>();
  for (const [gameId, items] of Object.entries(hotItemsByGame)) {
    const game = games.find((g) => g.id === gameId);
    for (const item of items) {
      if (!item.img || seen.has(item.img)) continue;
      // Wide cards (FF memberships) keep their shape; square passes stay square.
      const wide = item.badge ? [960, 368] : /ff-/.test(item.img) ? [736, 416] : [256, 256];
      seen.set(item.img, {
        key: `item:${gameId}:${item.label}`,
        group: "item",
        name: game ? `${game.name} · ${item.label}` : item.label,
        fallback: item.img,
        width: wide[0]!,
        height: wide[1]!,
      });
    }
  }
  return [...seen.values()];
}

export const imageSlots: ImageSlot[] = [
  {
    key: "banner",
    group: "banner",
    name: "Home banner",
    fallback: banner,
    width: 1280,
    height: 725,
  },
  ...games.map((g): ImageSlot => ({
    key: `game:${g.id}`,
    group: "game",
    name: g.name,
    fallback: g.icon,
    width: 512,
    height: 512,
  })),
  ...itemSlots(),
];

const slotByFallback = new Map(imageSlots.map((s) => [s.fallback, s.key]));

let overrides: Record<string, string> = {};
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Reads the uploaded pictures once per page load (or again with force). */
export function loadSiteImages(force = false): Promise<void> {
  if (request && !force) return request;
  request = (async () => {
    const { data, error } = await supabase.from("site_images").select("slot, url");
    if (error || !data) return;
    overrides = Object.fromEntries(data.map((r) => [r.slot, r.url]));
    notify();
  })();
  return request;
}

export function setSiteImageOverride(key: string, url: string | null) {
  const next = { ...overrides };
  if (url) next[key] = url;
  else delete next[key];
  overrides = next;
  notify();
}

export function siteImageOverrides() {
  return overrides;
}

/**
 * Returns a function that swaps a built-in picture for the owner's upload, if any:
 * `pic(game.icon)`. Before uploads load (and during SSR) the built-in one shows.
 */
export function useSiteImage(): (builtIn: string) => string {
  const [map, setMap] = useState(overrides);
  useEffect(() => {
    const update = () => setMap(overrides);
    listeners.add(update);
    update();
    void loadSiteImages();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return (builtIn) => {
    const key = slotByFallback.get(builtIn);
    return (key && map[key]) || builtIn;
  };
}

/** Center-crops a picture to exactly width x height and encodes it as WebP. */
export async function cropToSize(file: Blob, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9),
  );
  if (!blob) throw new Error("Couldn't encode the picture.");
  return blob;
}
