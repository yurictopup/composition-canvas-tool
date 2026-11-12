import { currencyPicture } from "@/components/CurrencyIcon";
import { findGame, getHotItems, packagePictures } from "@/lib/games";

export function gameImageUrls(gameId: string): string[] {
  const game = findGame(gameId);
  if (!game) return [];
  const urls = [
    game.icon,
    currencyPicture(gameId),
    ...Object.values(packagePictures[gameId] ?? {}),
    ...getHotItems(gameId).flatMap((h) => [h.img, h.icon]),
  ];
  return [...new Set(urls.filter((u): u is string => !!u))];
}

const warmed = new Set<string>();

export function warmImages(urls: string[]) {
  if (typeof Image === "undefined") return;
  for (const url of urls) {
    if (warmed.has(url)) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
