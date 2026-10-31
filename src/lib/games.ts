import mlbb from "@/assets/mlbb.webp";
import mlbbWeeklyPass from "@/assets/mlbb-weekly-pass.png";
import mlbbWeeklyElite from "@/assets/mlbb-weekly-elite.png";
import mlbbMonthlyEpic from "@/assets/mlbb-monthly-epic.png";
import mlbbTwilight from "@/assets/mlbb-twilight.png";
import bsTreasure from "@/assets/bloodstrike-treasure.png";
import bs105 from "@/assets/bloodstrike-105.png";
import bs320 from "@/assets/bloodstrike-320.png";
import bs540 from "@/assets/bloodstrike-540.png";
import bs1100 from "@/assets/bloodstrike-1100.png";
import bs2260 from "@/assets/bloodstrike-2260.png";
import bs5800 from "@/assets/bloodstrike-5800.png";
import mlbbFirstTopup from "@/assets/mlbb-first-topup.png";
import freefire from "@/assets/freefire.webp";
import ffWeeklyLite from "@/assets/ff-weekly-lite.webp";
import ffWeeklyCard from "@/assets/ff-weekly-card.webp";
import ffMonthlyCard from "@/assets/ff-monthly-card.webp";
import ffMembershipBundle from "@/assets/ff-membership-bundle.webp";
import magicchess from "@/assets/magicchess.webp";
import pubg from "@/assets/pubg-clean.webp";
import pubgFirstPurchase from "@/assets/pubg-first-purchase.webp";
import pubgFirearm from "@/assets/pubg-firearm-materials.webp";
import pubgMythicEmblem from "@/assets/pubg-mythic-emblem.webp";
import pubgPrime from "@/assets/pubg-prime.webp";
import pubgPrimePlus from "@/assets/pubg-prime-plus.webp";
import pubgElitePass from "@/assets/pubg-elite-pass.webp";
import pubgElitePassPlus from "@/assets/pubg-elite-pass-plus.webp";
import roblox from "@/assets/roblox.png";
import hok from "@/assets/hok.webp";
import wildrift from "@/assets/wildrift.webp";
import bloodstrike from "@/assets/bloodstrike.webp";
import genshin from "@/assets/genshin.webp";
import starrail from "@/assets/starrail.webp";
import valorant from "@/assets/valorant.webp";
import deltaforce from "@/assets/deltaforce.webp";
import arenabreakout from "@/assets/arenabreakout.webp";
import zzz from "@/assets/zzz.webp";
import eafc from "@/assets/eafc.webp";
import lol from "@/assets/lol.webp";
import hi3 from "@/assets/hi3.webp";
import telegram from "@/assets/telegram.svg";
import telegramStars from "@/assets/telegram-stars.png";

// Games FazerCards can top up for Cambodian accounts, plus Roblox, which the team delivers
// by hand through the buyer's Game Pass. CODM (India-only there) and the Supercell games
// were removed on 2026-10-27; their ID rules stay in player-id.ts.
// EAFC Mobile, League of Legends and Honkai Impact 3rd use FazerCards' Cambodia-region packs.
export const games = [
  { id: "mlbb", name: "Mobile Legends", icon: mlbb, unit: "Diamonds", blurb: "Instant MLBB diamond delivery" },
  { id: "ff", name: "Free Fire", icon: freefire, unit: "Diamonds", blurb: "Free Fire diamonds at the best price" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess, unit: "Diamonds", blurb: "Instant Magic Chess delivery" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg, unit: "UC", blurb: "Fast PUBG UC delivery" },
  { id: "roblox", name: "Roblox", icon: roblox, unit: "Robux", blurb: "Robux gift code Â· redeem at roblox.com/redeem" },
  // Bought by FazerCards for the buyer's Telegram username (see fazerTelegram).
  { id: "tgstars", name: "Telegram Stars", icon: telegramStars, unit: "Stars", blurb: "Stars sent to your Telegram username" },
  { id: "tgpremium", name: "Telegram Premium", icon: telegram, unit: "Months", blurb: "Premium for your Telegram username" },
  { id: "hok", name: "Honor of Kings", icon: hok, unit: "Tokens", blurb: "Tokens HoK áž…áž¼áž›áž—áŸ’áž›áž¶áž˜" },
  { id: "wildrift", name: "League of Legends: Wild Rift", icon: wildrift, unit: "Wild Cores", blurb: "League of Legends: Wild Rift" },
  { id: "bloodstrike", name: "Blood Strike", icon: bloodstrike, unit: "Gold", blurb: "Blood Strike" },
  { id: "genshin", name: "Genshin Impact", icon: genshin, unit: "Genesis Crystals", blurb: "Genshin Impact" },
  { id: "starrail", name: "Honkai: Star Rail", icon: starrail, unit: "Oneiric Shards", blurb: "Honkai: Star Rail" },
  { id: "valorant", name: "Valorant", icon: valorant, unit: "VP", blurb: "Valorant" },
  { id: "deltaforce", name: "Delta Force", icon: deltaforce, unit: "Delta Coins", blurb: "Delta Force" },
  { id: "arenabreakout", name: "Arena Breakout", icon: arenabreakout, unit: "Bonds", blurb: "Arena Breakout" },
  { id: "zzz", name: "Zenless Zone Zero", icon: zzz, unit: "Monochrome", blurb: "Zenless Zone Zero" },
  { id: "eafc", name: "EA SPORTS FC Mobile", icon: eafc, unit: "FC Points", blurb: "EA SPORTS FC Mobile" },
  { id: "lol", name: "League of Legends", icon: lol, unit: "RP", blurb: "League of Legends (PC)" },
  { id: "hi3", name: "Honkai Impact 3rd", icon: hi3, unit: "Crystals", blurb: "Honkai Impact 3rd" },
];

export type Game = (typeof games)[number];

/** Telegram has one tile (Premium); its page switches between Premium and Stars. */
export const telegramTabs = [
  { id: "tgpremium", label: "Telegram Premium" },
  { id: "tgstars", label: "Telegram Stars" },
];

/** Game tiles on the home and profile pages (Telegram Stars sits inside the Telegram tile). */
export const listedGames = games.filter((g) => g.id !== "tgstars");

// Other servers of a game. Each is its own game id (own packages, prices and FazerCards
// category) but is reached from the main game's page through the server tabs.
export const serverGames: (Game & { base: string; server: string })[] = [
  { id: "mlbb_ph", name: "Mobile Legends PH", icon: mlbb, unit: "Diamonds", blurb: "MLBB Philippines server", base: "mlbb", server: "Philippines" },
  { id: "mlbb_my", name: "Mobile Legends MY", icon: mlbb, unit: "Diamonds", blurb: "MLBB Malaysia server", base: "mlbb", server: "Malaysia" },
  { id: "ff_sg", name: "Free Fire SG", icon: freefire, unit: "Diamonds", blurb: "Free Fire Singapore server", base: "ff", server: "Singapore" },
  { id: "ff_ph", name: "Free Fire PH", icon: freefire, unit: "Diamonds", blurb: "Free Fire Philippines server", base: "ff", server: "Philippines" },
  { id: "ff_vn", name: "Free Fire VN", icon: freefire, unit: "Diamonds", blurb: "Free Fire Vietnam server", base: "ff", server: "Vietnam" },
  { id: "ff_id", name: "Free Fire ID", icon: freefire, unit: "Diamonds", blurb: "Free Fire Indonesia server", base: "ff", server: "Indonesia" },
];

/** Server tabs shown on a game page; the first is the main game. */
const mainServer: Record<string, string> = { mlbb: "Cambodia / Global", ff: "Malaysia / Singapore" };
export const gameServers: Record<string, { id: string; label: string }[]> = Object.fromEntries(
  Object.entries(mainServer).map(([base, label]) => [
    base,
    [{ id: base, label }, ...serverGames.filter((g) => g.base === base).map((g) => ({ id: g.id, label: g.server }))],
  ]),
);

export function findGame(id: string | undefined): Game | undefined {
  return games.find((g) => g.id === id) ?? serverGames.find((g) => g.id === id);
}

/** In-game pictures of single currency packages, by game and package amount. Uploads from /admin win. */
export const packagePictures: Record<string, Record<string, string>> = {
  bloodstrike: { "51": bs105, "105": bs105, "320": bs320, "540": bs540, "1100": bs1100, "2260": bs2260, "5800": bs5800 },
};

/** The main game of a server variant (same Player ID rules and name check). */
export function baseGameId(id: string): string {
  return serverGames.find((g) => g.id === id)?.base ?? id;
}

export type GamePackage = { amt: string; price: number | null; hot?: boolean; img?: string };
// img puts the item in "Recommended for You"; icon only replaces the currency icon in "More items".
export type HotItem = { label: string; price: number; img?: string; icon?: string; note?: string; badge?: string };

// Packages match what FazerCards sells for each game (read from the reseller panel on
// 2026-10-27, Cambodia-usable regions only).
// The live selling price comes from the Supabase product_prices table (edited on /admin,
// see src/lib/prices.ts); the prices here are only shown until that table loads.
export const gamePackages: Record<string, GamePackage[]> = {
  mlbb: [
    { amt: "11", price: 0.27 },
    { amt: "12", price: 0.29 },
    { amt: "14", price: 0.39 },
    { amt: "19", price: 0.49 },
    { amt: "22", price: 0.59 },
    { amt: "28", price: 0.69 },
    { amt: "42", price: 0.89 },
    { amt: "86", price: 1.25 },
    { amt: "112", price: 2.29 },
    { amt: "172", price: 2.49 },
    { amt: "257", price: 3.69 },
    { amt: "284", price: 5.19 },
    { amt: "296", price: 5.59 },
    { amt: "429", price: 5.99 },
    { amt: "570", price: 9.69 },
    { amt: "706", price: 9.89, hot: true },
    { amt: "716", price: 12.49 },
    { amt: "1084", price: 18.59 },
    { amt: "1163", price: 20.69 },
    { amt: "1446", price: 24.29 },
    { amt: "2195", price: 29.79 },
    { amt: "2398", price: 35.79 },
    { amt: "2976", price: 48.79 },
    { amt: "3688", price: 49.49 },
    { amt: "5532", price: 74.29 },
    { amt: "7502", price: 121.59 },
    { amt: "9288", price: 124.49 },
  ],
  mlbb_ph: [
    { amt: "11", price: 0.29 },
    { amt: "22", price: 0.49 },
    { amt: "56", price: 1.09 },
    { amt: "112", price: 1.89 },
    { amt: "223", price: 3.69 },
    { amt: "336", price: 5.49 },
    { amt: "570", price: 8.89, hot: true },
    { amt: "1163", price: 17.69 },
    { amt: "2398", price: 34.59 },
    { amt: "6042", price: 86.39 },
  ],
  mlbb_my: [
    { amt: "14", price: 0.39 },
    { amt: "42", price: 0.89 },
    { amt: "70", price: 1.29 },
    { amt: "140", price: 2.59 },
    { amt: "284", price: 5.19 },
    { amt: "355", price: 6.29 },
    { amt: "429", price: 7.49 },
    { amt: "716", price: 12.49, hot: true },
    { amt: "1084", price: 18.59 },
    { amt: "1446", price: 23.29 },
    { amt: "2976", price: 48.19 },
    { amt: "7502", price: 119.19 },
  ],
  ff: [
    { amt: "25", price: 0.29 },
    { amt: "100", price: 0.99 },
    { amt: "310", price: 2.99 },
    { amt: "520", price: 4.89 },
    { amt: "1060", price: 9.69, hot: true },
    { amt: "2180", price: 19.49 },
    { amt: "5600", price: 48.99 },
    { amt: "11500", price: 97.59 },
  ],
  ff_sg: [
    { amt: "25", price: 0.39 },
    { amt: "100", price: 1.19 },
    { amt: "310", price: 3.19 },
    { amt: "520", price: 5.29 },
    { amt: "1060", price: 10.19 },
    { amt: "2180", price: 20.39 },
    { amt: "5600", price: 49.99 },
    { amt: "11500", price: 99.99 },
  ],
  ff_ph: [
    { amt: "20", price: 0.29 },
    { amt: "40", price: 0.49 },
    { amt: "100", price: 1.29 },
    { amt: "205", price: 2.19 },
    { amt: "420", price: 4.29 },
    { amt: "650", price: 6.69 },
    { amt: "1100", price: 11.19 },
    { amt: "2250", price: 21.89 },
  ],
  ff_vn: [
    { amt: "25", price: 0.29 },
    { amt: "51", price: 0.49 },
    { amt: "113", price: 0.99 },
    { amt: "283", price: 2.09 },
    { amt: "566", price: 4.19 },
    { amt: "1132", price: 8.09 },
    { amt: "2830", price: 20.09 },
  ],
  ff_id: [
    { amt: "5", price: 0.15 },
    { amt: "12", price: 0.19 },
    { amt: "50", price: 0.49 },
    { amt: "70", price: 0.69 },
    { amt: "140", price: 1.29 },
    { amt: "355", price: 2.69 },
    { amt: "720", price: 5.39 },
    { amt: "1450", price: 10.39 },
    { amt: "2180", price: 15.59 },
    { amt: "3640", price: 25.49 },
    { amt: "7290", price: 50.99 },
  ],
  pubg: [
    { amt: "60", price: 0.95 },
    { amt: "300 + 25", price: 4.75 },
    { amt: "600 + 60", price: 9.49, hot: true },
    { amt: "1500 + 300", price: 23.75 },
    { amt: "3000 + 850", price: 47.49 },
    { amt: "6000 + 2100", price: 94.99 },
  ],
  hok: [
    { amt: "16", price: 0.22 },
    { amt: "80", price: 0.95 },
    { amt: "240", price: 2.85 },
    { amt: "400", price: 4.75 },
    { amt: "560", price: 6.65 },
    { amt: "830", price: 9.09, hot: true },
    { amt: "1245", price: 13.59 },
    { amt: "2508", price: 26.69 },
    { amt: "4180", price: 44.49 },
    { amt: "8360", price: 88.89 },
  ],
  magicchess: [
    { amt: "5", price: 0.19 },
    { amt: "11", price: 0.21 },
    { amt: "12", price: 0.22 },
    { amt: "19", price: 0.39 },
    { amt: "22", price: 0.49 },
    { amt: "28", price: 0.59 },
    { amt: "44", price: 0.79 },
    { amt: "56", price: 0.89 },
    { amt: "59", price: 0.99 },
    { amt: "86", price: 1.29 },
    { amt: "112", price: 1.89 },
    { amt: "165", price: 2.39 },
    { amt: "172", price: 2.45 },
    { amt: "223", price: 3.69 },
    { amt: "257", price: 3.89 },
    { amt: "275", price: 4.19 },
    { amt: "296", price: 5.09 },
    { amt: "344", price: 5.19 },
    { amt: "408", price: 6.89 },
    { amt: "516", price: 7.59 },
    { amt: "565", price: 8.09 },
    { amt: "570", price: 8.99 },
    { amt: "706", price: 9.85, hot: true },
    { amt: "875", price: 14.49 },
    { amt: "1060", price: 15.29 },
    { amt: "1163", price: 17.89 },
    { amt: "1346", price: 18.79 },
    { amt: "1825", price: 24.59 },
    { amt: "2195", price: 29.69 },
    { amt: "2398", price: 34.39 },
    { amt: "3688", price: 49.09 },
    { amt: "4830", price: 73.59 },
    { amt: "5532", price: 73.69 },
    { amt: "6042", price: 85.99 },
    { amt: "9288", price: 122.69 },
  ],
  wildrift: [
    { amt: "425", price: 4.99 },
    { amt: "1000", price: 10.99 },
    { amt: "1850", price: 19.99, hot: true },
    { amt: "3275", price: 34.99 },
    { amt: "4800", price: 49.99 },
    { amt: "10000", price: 99.99 },
  ],
  bloodstrike: [
    { amt: "51", price: 0.49 },
    { amt: "105", price: 0.99 },
    { amt: "320", price: 2.59 },
    { amt: "540", price: 4.19 },
    { amt: "1100", price: 8.19, hot: true },
    { amt: "2260", price: 16.39 },
    { amt: "5800", price: 40.89 },
  ],
  genshin: [
    { amt: "60", price: 1.19 },
    { amt: "300 + 30", price: 5.59 },
    { amt: "980 + 110", price: 16.19 },
    { amt: "1980 + 260", price: 31.69 },
    { amt: "3280 + 600", price: 52.79, hot: true },
    { amt: "6480 + 1600", price: 105.39 },
  ],
  starrail: [
    { amt: "60", price: 0.99 },
    { amt: "300 + 30", price: 4.99 },
    { amt: "980 + 110", price: 14.99 },
    { amt: "1980 + 260", price: 29.99 },
    { amt: "3280 + 600", price: 49.99, hot: true },
    { amt: "6480 + 1600", price: 99.99 },
  ],
  valorant: [
    { amt: "475", price: 4.99 },
    { amt: "1000", price: 9.99 },
    { amt: "2050", price: 19.99, hot: true },
    { amt: "3650", price: 34.99 },
    { amt: "5350", price: 49.99 },
    { amt: "11000", price: 99.99 },
  ],
  deltaforce: [
    { amt: "18", price: 0.29 },
    { amt: "30", price: 0.49 },
    { amt: "60", price: 0.99 },
    { amt: "320", price: 4.29 },
    { amt: "460", price: 5.99 },
    { amt: "750", price: 8.29, hot: true },
    { amt: "1480", price: 16.49 },
    { amt: "1980", price: 20.59 },
    { amt: "3950", price: 40.49 },
    { amt: "8100", price: 80.89 },
    { amt: "16200", price: 165.99 },
    { amt: "24300", price: 248.89 },
  ],
  arenabreakout: [
    { amt: "66", price: 0.99 },
    { amt: "335", price: 4.49 },
    { amt: "675", price: 8.39, hot: true },
    { amt: "1690", price: 20.99 },
    { amt: "3400", price: 41.09 },
    { amt: "6820", price: 82.09 },
  ],
  zzz: [
    { amt: "60", price: 1.29 },
    { amt: "300 + 30", price: 5.49 },
    { amt: "980 + 110", price: 15.89 },
    { amt: "1980 + 260", price: 31.09 },
    { amt: "3280 + 600", price: 51.79, hot: true },
    { amt: "6480 + 1600", price: 103.59 },
  ],
  eafc: [
    { amt: "40", price: 0.45 },
    { amt: "100", price: 1.09 },
    { amt: "520", price: 5.39 },
    { amt: "1070", price: 10.79, hot: true },
    { amt: "2200", price: 21.49 },
    { amt: "5750", price: 53.49 },
    { amt: "12000", price: 106.99 },
  ],
  lol: [
    { amt: "575", price: 5.19 },
    { amt: "1380", price: 11.39, hot: true },
    { amt: "2800", price: 22.69 },
    { amt: "4500", price: 35.99 },
    { amt: "6500", price: 51.49 },
    { amt: "13500", price: 102.99 },
  ],
  hi3: [
    { amt: "65", price: 1.15 },
    { amt: "330", price: 5.59 },
    { amt: "660", price: 11.19, hot: true },
    { amt: "1320", price: 22.39 },
    { amt: "3300", price: 55.99 },
    { amt: "6600", price: 111.99 },
  ],
  // CODM and the Supercell games are no longer sold (no Cambodia stock at FazerCards); kept so old orders still resolve.
  codm: [
    { amt: "80", price: 0.99 },
    { amt: "400 + 20", price: 4.99 },
    { amt: "800 + 80", price: 9.99, hot: true },
    { amt: "2000 + 400", price: 19.99 },
    { amt: "5000 + 1500", price: 49.99 },
    { amt: "10800 + 2800", price: 99.99 },
  ],
  coc: [
    { amt: "80", price: 0.99 },
    { amt: "500", price: 4.99 },
    { amt: "1200", price: 9.99, hot: true },
    { amt: "2500", price: 19.99 },
    { amt: "6500", price: 49.99 },
    { amt: "14000", price: 99.99 },
  ],
  brawlstars: [
    { amt: "30", price: 1.99 },
    { amt: "80", price: 4.99 },
    { amt: "170", price: 9.99, hot: true },
    { amt: "360", price: 19.99 },
    { amt: "950", price: 49.99 },
    { amt: "2000", price: 99.99 },
  ],
  clashroyale: [
    { amt: "80", price: 0.99 },
    { amt: "500", price: 4.99 },
    { amt: "1200", price: 9.99, hot: true },
    { amt: "2500", price: 19.99 },
    { amt: "6500", price: 49.99 },
    { amt: "14000", price: 99.99 },
  ],
  // Robux gift card codes (FazerCards Roblox Robux US), redeemed by the buyer.
  roblox: [
    { amt: "50", price: 1.79 },
    { amt: "275", price: 2.99 },
    { amt: "555", price: 5.79 },
    { amt: "1000", price: 9.79, hot: true },
    { amt: "2500", price: 24.49 },
    { amt: "5250", price: 49.49 },
    { amt: "11000", price: 99.49 },
  ],
  // Telegram Stars / Premium for a username; FazerCards cost on 2026-10-30 was
  // $0.0152 a star and $12.18 / $16.24 / $29.43 for 3 / 6 / 12 months.
  tgstars: [
    { amt: "50", price: 0.89 },
    { amt: "100", price: 1.75, hot: true },
    { amt: "250", price: 4.45 },
    { amt: "500", price: 8.69 },
    { amt: "750", price: 13.39 },
  ],
  tgpremium: [
    { amt: "3", price: 13.89, hot: true },
    { amt: "6", price: 18.49 },
    { amt: "12", price: 32.99 },
  ],
};

// Roblox keeps 30% of a Game Pass sale, so the pass must cost more than the Robux delivered.
export function robloxGamePassPrice(robux: number): number {
  return Math.ceil(robux / 0.7);
}

export function getPackages(gameId: string): GamePackage[] {
  return gamePackages[gameId] ?? [];
}

// Passes, cards and bundles FazerCards sells next to the currency packs. Items with a picture
// show as "Recommended for You" tiles; the rest list under "More items" with the currency icon.
export const hotItemsByGame: Record<string, HotItem[]> = {
  mlbb: [
    { label: "Weekly Pass", price: 1.55, img: mlbbWeeklyPass },
    { label: "Weekly Elite Pack", price: 1.09, img: mlbbWeeklyElite },
    { label: "Monthly Elite Pack", price: 4.09, img: mlbbMonthlyEpic },
    { label: "Twilight Pass", price: 8.39, img: mlbbTwilight },
    { label: "First Top-Up 50 + 5", price: 0.99, icon: mlbbFirstTopup },
    { label: "First Top-Up 150 + 15", price: 2.49, icon: mlbbFirstTopup },
    { label: "First Top-Up 250 + 25", price: 3.89, icon: mlbbFirstTopup },
    { label: "First Top-Up 500 + 65", price: 7.69, icon: mlbbFirstTopup },
  ],
  mlbb_ph: [
    { label: "Weekly Pass", price: 1.99, img: mlbbWeeklyPass },
    { label: "Twilight Pass", price: 9.09, img: mlbbTwilight },
    { label: "First Top-Up 50 + 5", price: 1.09, icon: mlbbFirstTopup },
    { label: "First Top-Up 150 + 15", price: 2.69, icon: mlbbFirstTopup },
    { label: "First Top-Up 250 + 25", price: 4.49, icon: mlbbFirstTopup },
    { label: "First Top-Up 500 + 65", price: 8.79, icon: mlbbFirstTopup },
  ],
  mlbb_my: [
    { label: "Weekly Pass", price: 2.19, img: mlbbWeeklyPass },
    { label: "Weekly Elite Pack", price: 1.19, img: mlbbWeeklyElite },
    { label: "Monthly Elite Pack", price: 5.09, img: mlbbMonthlyEpic },
    { label: "Twilight Pass", price: 9.19, img: mlbbTwilight },
    { label: "First Top-Up 50 + 5", price: 1.19, icon: mlbbFirstTopup },
    { label: "First Top-Up 150 + 15", price: 3.09, icon: mlbbFirstTopup },
    { label: "First Top-Up 250 + 25", price: 5.09, icon: mlbbFirstTopup },
    { label: "First Top-Up 500 + 65", price: 9.89, icon: mlbbFirstTopup },
  ],
  ff: [
    { label: "Weekly Lite", price: 0.39, img: ffWeeklyLite, note: "7 days" },
    { label: "Weekly Card", price: 1.79, img: ffWeeklyCard, note: "7 days" },
    { label: "Monthly Card", price: 8.39, img: ffMonthlyCard, note: "30 days" },
    { label: "Bundle M+W+L", price: 10.39, img: ffMembershipBundle, note: "Monthly + Weekly + Lite", badge: "HOT" },
    { label: "Level Up Pack Lv6", price: 0.39 },
    { label: "Level Up Pack Lv10", price: 0.79 },
    { label: "Level Up Pack Lv15", price: 0.79 },
    { label: "Level Up Pack Lv20", price: 0.79 },
    { label: "Level Up Pack Lv25", price: 0.79 },
    { label: "Level Up Pack Lv30", price: 1.19 },
  ],
  ff_sg: [
    { label: "Weekly Lite", price: 0.39, img: ffWeeklyLite, note: "7 days" },
    { label: "Weekly Card", price: 1.89, img: ffWeeklyCard, note: "7 days" },
    { label: "Monthly Card", price: 8.19, img: ffMonthlyCard, note: "30 days" },
    { label: "Level Up Pack Lv6", price: 0.39 },
    { label: "Level Up Pack Lv10", price: 0.89 },
    { label: "Level Up Pack Lv15", price: 0.89 },
    { label: "Level Up Pack Lv20", price: 0.89 },
    { label: "Level Up Pack Lv25", price: 0.89 },
    { label: "Level Up Pack Lv30", price: 1.19 },
  ],
  ff_vn: [
    { label: "Weekly Lite", price: 0.59, img: ffWeeklyLite, note: "7 days" },
    { label: "Weekly Card", price: 2.19, img: ffWeeklyCard, note: "7 days" },
    { label: "Monthly Card", price: 9.19, img: ffMonthlyCard, note: "30 days" },
  ],
  ff_id: [
    { label: "Weekly Card", price: 1.69, img: ffWeeklyCard, note: "7 days" },
    { label: "Monthly Card", price: 4.89, img: ffMonthlyCard, note: "30 days" },
    { label: "BP Card", price: 2.69 },
    { label: "Level Up Pack Lv6", price: 0.39 },
    { label: "Level Up Pack Lv10", price: 0.59 },
    { label: "Level Up Pack Lv15", price: 0.59 },
    { label: "Level Up Pack Lv20", price: 0.59 },
    { label: "Level Up Pack Lv25", price: 0.59 },
    { label: "Level Up Pack Lv30", price: 0.99 },
  ],
  pubg: [
    { label: "First Purchase Pack", price: 1.19, icon: pubgFirstPurchase },
    { label: "Weekly Deal Pack 1", price: 1.09 },
    { label: "Weekly Deal Pack 2", price: 2.89 },
    { label: "Upgradable Firearm Materials Pack", price: 2.89, icon: pubgFirearm },
    { label: "Weekly Mythic Emblem Pack", price: 2.89, icon: pubgMythicEmblem },
    { label: "Mythic Emblem Pack", price: 4.89, icon: pubgMythicEmblem },
    { label: "Prime 1 Month", price: 1.19, icon: pubgPrime },
    { label: "Prime 3 Months", price: 2.99, icon: pubgPrime },
    { label: "Prime 6 Months", price: 5.79, icon: pubgPrime },
    { label: "Prime 12 Months", price: 11.49, icon: pubgPrime },
    { label: "Prime Plus 1 Month", price: 9.59, icon: pubgPrimePlus },
    { label: "Prime Plus 3 Months", price: 27.99, icon: pubgPrimePlus },
    { label: "Prime Plus 6 Months", price: 55.19, icon: pubgPrimePlus },
    { label: "Prime Plus 12 Months", price: 111.39, icon: pubgPrimePlus },
    { label: "Elite Pass LV1-50", price: 5.79, icon: pubgElitePass },
    { label: "Elite Pass LV1-100", price: 11.59, icon: pubgElitePass },
    { label: "Elite Pass Plus LV1-100", price: 26.89, icon: pubgElitePassPlus },
  ],
  hok: [
    { label: "Weekly Card", price: 1.19 },
    { label: "Weekly Card Plus", price: 3.29 },
    { label: "Double Token Lucky Bag", price: 0.49 },
    { label: "Honor Point Value Pack", price: 0.49 },
    { label: "Standard Purchase Rebate Pack", price: 0.49 },
    { label: "Premium Purchase Rebate Pack", price: 1.39 },
  ],
  magicchess: [
    { label: "Weekly Card", price: 2.09 },
    { label: "First Recharge 50 + 50", price: 1.09 },
    { label: "First Recharge 150 + 150", price: 2.69 },
    { label: "First Recharge 250 + 250", price: 4.49 },
    { label: "First Recharge 500 + 500", price: 9.59 },
    { label: "Battle for Discounts", price: 0.99 },
    { label: "Lukas's Battle Bounty", price: 0.99 },
  ],
  bloodstrike: [
    { label: "Season Pass", price: 0.99, icon: bsTreasure },
    { label: "Level Up Pass", price: 1.79, icon: bsTreasure },
    { label: "Strike Pass Elite", price: 3.49, icon: bsTreasure },
    { label: "Strike Pass Premium", price: 7.59, icon: bsTreasure },
    { label: "Ultra Skin Lucky Chest", price: 0.49, icon: bsTreasure },
    { label: "Lucky Bag Week", price: 0.99, icon: bsTreasure },
    { label: "$0.49 Deal", price: 0.49, icon: bsTreasure },
    { label: "$0.99 Deal", price: 0.99, icon: bsTreasure },
    { label: "$1.99 Deal", price: 1.79, icon: bsTreasure },
    { label: "$2.99 Deal", price: 2.69, icon: bsTreasure },
    { label: "$3.99 Deal", price: 3.49, icon: bsTreasure },
    { label: "$4.99 Deal", price: 4.39, icon: bsTreasure },
    { label: "$5.99 Deal", price: 5.19, icon: bsTreasure },
    { label: "$6.99 Deal", price: 5.89, icon: bsTreasure },
    { label: "$7.99 Deal", price: 6.69, icon: bsTreasure },
    { label: "$8.99 Deal", price: 7.59, icon: bsTreasure },
    { label: "$9.99 Deal", price: 8.39, icon: bsTreasure },
  ],
  genshin: [
    { label: "Blessing of the Welkin Moon", price: 5.59 },
  ],
  starrail: [
    { label: "Express Supply Pass", price: 4.89 },
  ],
  deltaforce: [
    { label: "Season Pass Operations Special", price: 4.79 },
    { label: "Season Pass Warfare Special", price: 4.79 },
    { label: "Season Pass Deluxe", price: 6.39 },
  ],
  arenabreakout: [
    { label: "Beginner Select", price: 0.99 },
    { label: "Monthly Advanced Battle Pass", price: 1.09 },
    { label: "Bulletproof Case Privileges", price: 2.39 },
    { label: "Bulletproof Case 30 Days", price: 2.49 },
    { label: "Monthly Premium Battle Pass", price: 3.89 },
    { label: "Composite Case Privileges", price: 6.99 },
    { label: "Composite Case 30 Days", price: 7.09 },
    { label: "Quarterly Premium Battle Pass Bundle", price: 11.29 },
  ],
  zzz: [
    { label: "Inter-Knot Membership", price: 5.49 },
  ],
  eafc: [
    { label: "39 Silver", price: 0.49 },
    { label: "99 Silver", price: 1.29 },
    { label: "499 Silver", price: 5.49 },
    { label: "999 Silver", price: 10.49 },
    { label: "1999 Silver", price: 20.99 },
    { label: "4999 Silver", price: 51.39 },
    { label: "9999 Silver", price: 102.69 },
  ],
  hi3: [
    { label: "Monthly Card", price: 5.49 },
    { label: "65 B-Chips", price: 1.19 },
    { label: "330 B-Chips", price: 5.49 },
    { label: "990 B-Chips", price: 16.89 },
    { label: "1320 B-Chips", price: 21.39 },
    { label: "1980 B-Chips", price: 32.09 },
    { label: "3300 B-Chips", price: 53.49 },
    { label: "6600 B-Chips", price: 106.99 },
  ],
};

export function getHotItems(gameId: string): HotItem[] {
  return hotItemsByGame[gameId] ?? [];
}

export const payments = ["Bakong"];

export const store = {
  name: "Yuric Topup",
  telegram: "@Yuricccc",
  hours: "24 Hours",
};
