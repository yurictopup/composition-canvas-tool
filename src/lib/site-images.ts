import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import banner from "@/assets/banner-angkor.webp";
import { findGame, gamePackages, games, hotItemsByGame } from "@/lib/games";

// Pictures the owner can replace from /admin. Each slot has a built-in picture;
// an uploaded one (public.site_images + the site-images bucket) is shown instead.
// Currency packages and passes without artwork have no built-in picture (fallback ""):
// the shop shows the game's currency icon until the owner uploads one.

export type ImageSlot = {
  key: string;
  group: "banner" | "game" | "item" | "package";
  /** Game the picture belongs to (items and packages). */
  gameId?: string;
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
      const key = `item:${gameId}:${item.label}`;
      if (seen.has(item.img ?? key)) continue;
      // Wide cards (FF memberships) keep their shape; square passes stay square.
      const wide = item.badge
        ? [960, 368]
        : item.img && /ff-/.test(item.img)
          ? [736, 416]
          : [256, 256];
      seen.set(item.img ?? key, {
        key,
        group: "item",
        gameId,
        name: game ? `${game.name} · ${item.label}` : item.label,
        fallback: item.img ?? item.icon ?? "",
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

/** Slot of one currency package, e.g. pkg:mlbb:86. Shown in place of the currency icon. */
export function packageSlotKey(gameId: string, amt: string): string {
  return `pkg:${gameId}:${amt}`;
}

export function packageSlot(gameId: string, amt: string): ImageSlot {
  const game = findGame(gameId);
  return {
    key: packageSlotKey(gameId, amt),
    group: "package",
    gameId,
    name: game ? `${game.name} · ${amt} ${game.unit}` : amt,
    fallback: "",
    width: 256,
    height: 256,
  };
}

/** Games that sell currency packages, for the package picture picker. */
export const packageGameIds = Object.keys(gamePackages).filter((id) => findGame(id));

const slotByFallback = new Map(
  imageSlots.filter((s) => s.fallback).map((s) => [s.fallback, s.key]),
);

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
  const map = useOverrides();
  return (builtIn) => {
    const key = slotByFallback.get(builtIn);
    return (key && map[key]) || builtIn;
  };
}

/**
 * Returns a function that gives the owner's upload for a slot key, or undefined when
 * there is none: `slotPic(packageSlotKey(game.id, p.amt))`.
 */
export function useSlotImage(): (key: string) => string | undefined {
  const map = useOverrides();
  return (key) => map[key];
}

function useOverrides(): Record<string, string> {
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
  return map;
}

/** Where the picture sits in the slot, in output pixels (the crop editor sets it). */
export type CropPlacement = { x: number; y: number; scale: number };

/**
 * Draws a picture into a width x height slot at the given placement and encodes it as
 * WebP. Without a placement the picture is centred and fills the slot. Parts of the slot
 * the picture doesn't cover stay transparent.
 */
export async function cropToSize(
  file: Blob,
  width: number,
  height: number,
  placement?: CropPlacement,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = placement?.scale ?? Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const x = placement?.x ?? (width - w) / 2;
  const y = placement?.y ?? (height - h) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, x, y, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9),
  );
  if (!blob) throw new Error("Couldn't encode the picture.");
  return blob;
}
