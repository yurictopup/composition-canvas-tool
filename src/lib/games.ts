import mlbb from "@/assets/mlbb.png";
import mlbbWeeklyPass from "@/assets/mlbb-weekly-pass.png";
import mlbbWeeklyX3 from "@/assets/mlbb-weekly-x3.png";
import mlbb165Weekly from "@/assets/mlbb-165-weekly.png";
import mlbbTwilight from "@/assets/mlbb-twilight.png";
import freefire from "@/assets/freefire.png";
import ffWeeklyLite from "@/assets/ff-weekly-lite.png";
import ffWeeklyCard from "@/assets/ff-weekly-card.png";
import ffMonthlyCard from "@/assets/ff-monthly-card.png";
import ffMembershipBundle from "@/assets/ff-membership-bundle.png";
import roblox from "@/assets/roblox.png";
import magicchess from "@/assets/magicchess.png";
import pubg from "@/assets/pubg-clean.png";
import hok from "@/assets/hok.png";
import codm from "@/assets/codm.jpg";
import wildrift from "@/assets/wildrift.jpg";
import bloodstrike from "@/assets/bloodstrike.jpg";
import coc from "@/assets/coc.jpg";
import genshin from "@/assets/genshin.jpg";
import starrail from "@/assets/starrail.jpg";
import valorant from "@/assets/valorant.jpg";
import deltaforce from "@/assets/deltaforce.jpg";
import arenabreakout from "@/assets/arenabreakout.jpg";
import brawlstars from "@/assets/brawlstars.jpg";
import clashroyale from "@/assets/clashroyale.jpg";
import zzz from "@/assets/zzz.jpg";

export const games = [
  { id: "mlbb", name: "Mobile Legends", icon: mlbb, unit: "Diamonds", blurb: "Instant MLBB diamond delivery" },
  { id: "ff", name: "Free Fire", icon: freefire, unit: "Diamonds", blurb: "Free Fire diamonds at the best price" },
  { id: "roblox", name: "Roblox", icon: roblox, unit: "Robux", blurb: "Fast Robux delivery" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess, unit: "Diamonds", blurb: "Instant Magic Chess delivery" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg, unit: "UC", blurb: "Fast PUBG UC delivery" },
  { id: "hok", name: "Honor of Kings", icon: hok, unit: "Tokens", blurb: "Tokens HoK ចូលភ្លាម" },
  { id: "codm", name: "Call of Duty: Mobile", icon: codm, unit: "CP", blurb: "Call of Duty: Mobile" },
  { id: "wildrift", name: "League of Legends: Wild Rift", icon: wildrift, unit: "Wild Cores", blurb: "League of Legends: Wild Rift" },
  { id: "bloodstrike", name: "Blood Strike", icon: bloodstrike, unit: "Gold", blurb: "Blood Strike" },
  { id: "coc", name: "Clash of Clans", icon: coc, unit: "Gems", blurb: "Clash of Clans" },
  { id: "genshin", name: "Genshin Impact", icon: genshin, unit: "Genesis Crystals", blurb: "Genshin Impact" },
  { id: "starrail", name: "Honkai: Star Rail", icon: starrail, unit: "Oneiric Shards", blurb: "Honkai: Star Rail" },
  { id: "valorant", name: "Valorant", icon: valorant, unit: "VP", blurb: "Valorant" },
  { id: "deltaforce", name: "Delta Force", icon: deltaforce, unit: "Delta Coins", blurb: "Delta Force" },
  { id: "arenabreakout", name: "Arena Breakout", icon: arenabreakout, unit: "Bonds", blurb: "Arena Breakout" },
  { id: "brawlstars", name: "Brawl Stars", icon: brawlstars, unit: "Gems", blurb: "Brawl Stars" },
  { id: "clashroyale", name: "Clash Royale", icon: clashroyale, unit: "Gems", blurb: "Clash Royale" },
  { id: "zzz", name: "Zenless Zone Zero", icon: zzz, unit: "Monochrome", blurb: "Zenless Zone Zero" },
];

export type Game = (typeof games)[number];

export function findGame(id: string | undefined): Game | undefined {
  return games.find((g) => g.id === id);
}

export type GamePackage = { amt: string; price: number | null; hot?: boolean; img?: string };
export type HotItem = { label: string; price: number; img: string; note?: string; badge?: string };

// Real in-game denominations per game. The live selling price comes from the
// Supabase product_prices table (edited on /admin, see src/lib/prices.ts);
// the prices here are only shown until that table loads.
export const gamePackages: Record<string, GamePackage[]> = {
  mlbb: [
    { amt: "86", price: 1.25 },
    { amt: "172", price: 2.49 },
    { amt: "257", price: 3.69 },
    { amt: "706", price: 9.89, hot: true },
    { amt: "2195", price: 29.79 },
    { amt: "3688", price: 49.49 },
    { amt: "5532", price: 74.29 },
    { amt: "9288", price: 124.49 },
  ],
  ff: [
    { amt: "25", price: 0.29 },
    { amt: "100", price: 0.99 },
    { amt: "310", price: 2.99 },
    { amt: "520", price: 4.89 },
    { amt: "1060", price: 9.69, hot: true },
    { amt: "2180", price: 19.49 },
    { amt: "5600", price: 48.99 },
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
    { amt: "800", price: 9.49, hot: true },
    { amt: "1200", price: 14.29 },
    { amt: "2400", price: 28.49 },
    { amt: "4000", price: 47.49 },
  ],
  magicchess: [
    { amt: "12", price: 0.22 },
    { amt: "59", price: 0.99 },
    { amt: "86", price: 1.29 },
    { amt: "172", price: 2.45 },
    { amt: "257", price: 3.59 },
    { amt: "344", price: 4.79 },
    { amt: "514", price: 7.19 },
    { amt: "706", price: 9.85, hot: true },
    { amt: "1050", price: 14.79 },
    { amt: "2195", price: 29.69 },
  ],
  codm: [
    { amt: "80", price: 0.99 },
    { amt: "400 + 20", price: 4.99 },
    { amt: "800 + 80", price: 9.99, hot: true },
    { amt: "2000 + 400", price: 19.99 },
    { amt: "5000 + 1500", price: 49.99 },
    { amt: "10800 + 2800", price: 99.99 },
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
    { amt: "56", price: 0.49 },
    { amt: "116", price: 0.99 },
    { amt: "352", price: 2.99 },
    { amt: "594", price: 4.99 },
    { amt: "1210", price: 9.99, hot: true },
    { amt: "2486", price: 19.99 },
    { amt: "6380", price: 49.99 },
  ],
  coc: [
    { amt: "80", price: 0.99 },
    { amt: "500", price: 4.99 },
    { amt: "1200", price: 9.99, hot: true },
    { amt: "2500", price: 19.99 },
    { amt: "6500", price: 49.99 },
    { amt: "14000", price: 99.99 },
  ],
  genshin: [
    { amt: "60", price: 0.99 },
    { amt: "300 + 30", price: 4.99 },
    { amt: "980 + 110", price: 14.99 },
    { amt: "1980 + 260", price: 29.99 },
    { amt: "3280 + 600", price: 49.99, hot: true },
    { amt: "6480 + 1600", price: 99.99 },
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
    { amt: "60", price: 0.99 },
    { amt: "300 + 36", price: 4.99 },
    { amt: "680 + 90", price: 9.99, hot: true },
    { amt: "1280 + 190", price: 19.99 },
    { amt: "1980 + 340", price: 29.99 },
    { amt: "3280 + 600", price: 49.99 },
    { amt: "6480 + 1300", price: 99.99 },
  ],
  arenabreakout: [
    { amt: "60", price: 0.99 },
    { amt: "310", price: 4.99 },
    { amt: "630", price: 9.99, hot: true },
    { amt: "1580", price: 24.99 },
    { amt: "3200", price: 49.99 },
    { amt: "6500", price: 99.99 },
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
  zzz: [
    { amt: "60", price: 0.99 },
    { amt: "300 + 30", price: 4.99 },
    { amt: "980 + 110", price: 14.99 },
    { amt: "1980 + 260", price: 29.99 },
    { amt: "3280 + 600", price: 49.99, hot: true },
    { amt: "6480 + 1600", price: 99.99 },
  ],
  // Robux are sent by the team to the buyer's Roblox username.
  roblox: [
    { amt: "80", price: 0.89 },
    { amt: "500", price: 4.45 },
    { amt: "1000", price: 8.89, hot: true },
    { amt: "2000", price: 17.79 },
  ],
};

export function getPackages(gameId: string): GamePackage[] {
  return gamePackages[gameId] ?? [];
}

export const mlbbHotItems: HotItem[] = [
  { label: "Weekly Pass", price: 1.55, img: mlbbWeeklyPass },
  { label: "Weekly Elite Pack", price: 1.09, img: mlbbWeeklyX3 },
  { label: "Weekly + 223💎", price: 6.59, img: mlbb165Weekly },
  { label: "Twilight Pass", price: 8.39, img: mlbbTwilight },
];

// Free Fire membership cards, delivered by the team like the diamond packs.
export const ffHotItems: HotItem[] = [
  { label: "Weekly Lite", price: 0.39, img: ffWeeklyLite, note: "7 days" },
  { label: "Weekly Card", price: 1.59, img: ffWeeklyCard, note: "7 days" },
  { label: "Monthly Card", price: 7.59, img: ffMonthlyCard, note: "30 days" },
  { label: "Bundle M+W+L", price: 9.57, img: ffMembershipBundle, note: "Monthly + Weekly + Lite", badge: "BUNDLE" },
];

const hotItemsByGame: Record<string, HotItem[]> = { mlbb: mlbbHotItems, ff: ffHotItems };

export function getHotItems(gameId: string): HotItem[] {
  return hotItemsByGame[gameId] ?? [];
}

export const payments = ["Bakong"];

export const store = {
  name: "Yuric Topup",
  telegram: "@Yuricccc",
  hours: "24 Hours",
  ownerEmail: "yurictopup@gmail.com",
};

export function isOwner(email: string | null | undefined): boolean {
  return email?.toLowerCase() === store.ownerEmail.toLowerCase();
}
