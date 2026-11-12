// Loads a game page's pictures before they are needed, so tiles don't pop in one by one:
// the page head asks for them while the page code loads, and hovering (or touching) a game
// on the home page fetches them ahead of the click.
import { currencyPicture } from "@/components/CurrencyIcon";
import { findGame, getHotItems, packagePictures } from "@/lib/games";

/** Pictures shown on a game's page: its icon, package pictures, passes and the currency icon. */
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

/** Starts downloading pictures in the background; each one only once. */
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
