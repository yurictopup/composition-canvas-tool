import mlbb from "@/assets/mlbb.png.asset.json";
import freefire from "@/assets/freefire.png.asset.json";
import roblox from "@/assets/roblox.png.asset.json";
import magicchess from "@/assets/magicchess.png.asset.json";
import pubg from "@/assets/pubg-clean.png";
import hok from "@/assets/hok.png.asset.json";
import codm from "@/assets/codm.jpg.asset.json";
import wildrift from "@/assets/wildrift.jpg.asset.json";
import bloodstrike from "@/assets/bloodstrike.jpg.asset.json";
import coc from "@/assets/coc.jpg.asset.json";
import genshin from "@/assets/genshin.jpg.asset.json";
import starrail from "@/assets/starrail.jpg.asset.json";

export const games = [
  { id: "mlbb", name: "Mobile Legends", icon: mlbb.url, unit: "Diamonds", blurb: "Instant MLBB diamond delivery" },
  { id: "ff", name: "Free Fire", icon: freefire.url, unit: "Diamonds", blurb: "Free Fire diamonds at the best price" },
  { id: "roblox", name: "Roblox", icon: roblox.url, unit: "Robux", blurb: "Fast Robux delivery" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess.url, unit: "Diamonds", blurb: "Instant Magic Chess delivery" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg, unit: "UC", blurb: "Fast PUBG UC delivery" },
  { id: "hok", name: "Honor of Kings", icon: hok.url, unit: "Tokens", blurb: "Tokens HoK ចូលភ្លាម" },
  { id: "codm", name: "Call of Duty: Mobile", icon: codm.url, unit: "CP", blurb: "Call of Duty: Mobile" },
  { id: "wildrift", name: "League of Legends: Wild Rift", icon: wildrift.url, unit: "Wild Cores", blurb: "League of Legends: Wild Rift" },
  { id: "bloodstrike", name: "Blood Strike", icon: bloodstrike.url, unit: "Gold", blurb: "Blood Strike" },
  { id: "coc", name: "Clash of Clans", icon: coc.url, unit: "Gems", blurb: "Clash of Clans" },
  { id: "genshin", name: "Genshin Impact", icon: genshin.url, unit: "Genesis Crystals", blurb: "Genshin Impact" },
  { id: "starrail", name: "Honkai: Star Rail", icon: starrail.url, unit: "Oneiric Shards", blurb: "Honkai: Star Rail" },
];

export type Game = (typeof games)[number];

export function findGame(id: string | undefined): Game | undefined {
  return games.find((g) => g.id === id);
}

export type GamePackage = { amt: string; price: number | null; hot?: boolean };

// Real in-game denominations per game. Prices stay null until the shop
// provides its real selling prices — unpriced packages cannot be purchased.
export const gamePackages: Record<string, GamePackage[]> = {
  mlbb: [
    { amt: "86", price: 1.29 },
    { amt: "165", price: 2.45 },
    { amt: "172", price: 2.65 },
    { amt: "275", price: 3.75 },
    { amt: "312", price: 4.29 },
    { amt: "343", price: 4.89 },
    { amt: "361", price: 4.95 },
    { amt: "429", price: 6.09 },
    { amt: "514", price: 7.19 },
    { amt: "565", price: 7.69 },
    { amt: "600", price: 8.49 },
    { amt: "706", price: 9.85, hot: true },
    { amt: "878", price: 12.19 },
    { amt: "1049", price: 14.79 },
    { amt: "1412", price: 19.59 },
    { amt: "2195", price: 29.69 },
    { amt: "2538", price: 34.49 },
    { amt: "3688", price: 49.5 },
    { amt: "4394", price: 58.49 },
    { amt: "5532", price: 73.99 },
    { amt: "6238", price: 83.49 },
    { amt: "7727", price: 103.49 },
    { amt: "9288", price: 124.49 },
    { amt: "11483", price: 153.49 },
  ],
  ff: [
    { amt: "50", price: null },
    { amt: "115", price: null },
    { amt: "240", price: null },
    { amt: "355", price: null },
    { amt: "480", price: null },
    { amt: "505", price: null, hot: true },
    { amt: "610", price: null },
    { amt: "850", price: null },
    { amt: "1080", price: null },
    { amt: "1240", price: null },
    { amt: "2530", price: null },
  ],
  pubg: [
    { amt: "60", price: null },
    { amt: "120", price: null },
    { amt: "180", price: null },
    { amt: "325", price: null },
    { amt: "660", price: null },
    { amt: "720", price: null },
    { amt: "985", price: null },
    { amt: "1800", price: null, hot: true },
    { amt: "3850", price: null },
    { amt: "8100", price: null },
  ],
  hok: [
    { amt: "16", price: null },
    { amt: "80", price: null },
    { amt: "240", price: null },
    { amt: "400", price: null },
    { amt: "560", price: null },
    { amt: "800", price: null },
    { amt: "1600", price: null },
    { amt: "2400", price: null },
    { amt: "4000", price: null },
    { amt: "8000", price: null },
  ],
  magicchess: [
    { amt: "12", price: null },
    { amt: "59", price: null },
    { amt: "86", price: null },
    { amt: "172", price: null },
    { amt: "257", price: null },
    { amt: "344", price: null },
    { amt: "514", price: null },
    { amt: "706", price: null, hot: true },
    { amt: "1050", price: null },
    { amt: "2195", price: null },
  ],
  codm: [
    { amt: "80", price: null },
    { amt: "400", price: null },
    { amt: "800", price: null },
    { amt: "2000", price: null },
    { amt: "5000", price: null },
    { amt: "10800", price: null },
  ],
  wildrift: [
    { amt: "425", price: null },
    { amt: "950", price: null },
    { amt: "1850", price: null },
    { amt: "3275", price: null },
    { amt: "4750", price: null },
    { amt: "9500", price: null },
  ],
  bloodstrike: [
    { amt: "24", price: null },
    { amt: "60", price: null },
    { amt: "90", price: null },
    { amt: "180", price: null },
    { amt: "300", price: null },
    { amt: "600", price: null },
    { amt: "1200", price: null },
    { amt: "1800", price: null },
    { amt: "3600", price: null },
    { amt: "6000", price: null },
  ],
  coc: [
    { amt: "80", price: null },
    { amt: "500", price: null },
    { amt: "1200", price: null },
    { amt: "2500", price: null },
    { amt: "6500", price: null },
    { amt: "14000", price: null },
  ],
  genshin: [
    { amt: "60", price: null },
    { amt: "300 + 30", price: null },
    { amt: "980 + 110", price: null },
    { amt: "1980 + 260", price: null },
    { amt: "3280 + 600", price: null, hot: true },
    { amt: "6480 + 1600", price: null },
  ],
  starrail: [
    { amt: "60", price: null },
    { amt: "300 + 30", price: null },
    { amt: "980 + 110", price: null },
    { amt: "1980 + 260", price: null },
    { amt: "3280 + 600", price: null, hot: true },
    { amt: "6480 + 1600", price: null },
  ],
  // Roblox sells via Gift Card / official store — no direct ID top-up packages.
  roblox: [],
};

export function getPackages(gameId: string): GamePackage[] {
  return gamePackages[gameId] ?? [];
}

export const payments = ["ABA KHQR", "Wing", "ACLEDA", "Bakong"];

export const store = {
  name: "Yuric Topup",
  telegram: "@Yuricccc",
  hours: "24 Hours",
};
