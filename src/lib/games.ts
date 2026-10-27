import mlbb from "@/assets/mlbb.png";
import mlbbWeeklyPass from "@/assets/mlbb-weekly-pass.png";
import mlbbWeeklyX3 from "@/assets/mlbb-weekly-x3.png";
import mlbbTwilight from "@/assets/mlbb-twilight.png";
import freefire from "@/assets/freefire.png";
import ffWeeklyLite from "@/assets/ff-weekly-lite.png";
import ffWeeklyCard from "@/assets/ff-weekly-card.png";
import ffMonthlyCard from "@/assets/ff-monthly-card.png";
import ffMembershipBundle from "@/assets/ff-membership-bundle.png";
import magicchess from "@/assets/magicchess.png";
import pubg from "@/assets/pubg-clean.png";
import roblox from "@/assets/roblox.png";
import hok from "@/assets/hok.png";
import wildrift from "@/assets/wildrift.jpg";
import bloodstrike from "@/assets/bloodstrike.jpg";
import genshin from "@/assets/genshin.jpg";
import starrail from "@/assets/starrail.jpg";
import valorant from "@/assets/valorant.jpg";
import deltaforce from "@/assets/deltaforce.jpg";
import arenabreakout from "@/assets/arenabreakout.jpg";
import zzz from "@/assets/zzz.jpg";
import eafc from "@/assets/eafc.jpg";
import lol from "@/assets/lol.jpg";
import hi3 from "@/assets/hi3.jpg";

// Games FazerCards can top up for Cambodian accounts, plus Roblox, which the team delivers
// by hand through the buyer's Game Pass. CODM (India-only there) and the Supercell games
// were removed on 2026-10-27; their ID rules stay in player-id.ts.
// EAFC Mobile, League of Legends and Honkai Impact 3rd use FazerCards' Cambodia-region packs.
export const games = [
  { id: "mlbb", name: "Mobile Legends", icon: mlbb, unit: "Diamonds", blurb: "Instant MLBB diamond delivery" },
  { id: "ff", name: "Free Fire", icon: freefire, unit: "Diamonds", blurb: "Free Fire diamonds at the best price" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess, unit: "Diamonds", blurb: "Instant Magic Chess delivery" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg, unit: "UC", blurb: "Fast PUBG UC delivery" },
  { id: "roblox", name: "Roblox", icon: roblox, unit: "Robux", blurb: "Robux by Game Pass" },
  { id: "hok", name: "Honor of Kings", icon: hok, unit: "Tokens", blurb: "Tokens HoK ចូលភ្លាម" },
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

export function findGame(id: string | undefined): Game | undefined {
  return games.find((g) => g.id === id);
}

export type GamePackage = { amt: string; price: number | null; hot?: boolean; img?: string };
export type HotItem = { label: string; price: number; img?: string; note?: string; badge?: string };

// Packages match what FazerCards sells for each game (read from the reseller panel on
// 2026-10-27, Cambodia-usable regions only).
// The live selling price comes from the Supabase product_prices table (edited on /admin,
// see src/lib/prices.ts); the prices here are only shown until that table loads.
export const gamePackages: Record<string, GamePackage[]> = {
  mlbb: [
    { amt: "11", price: 0.39 },
    { amt: "12", price: 0.29 },
    { amt: "14", price: 0.39 },
    { amt: "19", price: 0.49 },
    { amt: "22", price: 0.69 },
    { amt: "28", price: 0.69 },
    { amt: "42", price: 0.89 },
    { amt: "56", price: 1.39 },
    { amt: "70", price: 1.29 },
    { amt: "86", price: 1.25 },
    { amt: "112", price: 2.29 },
    { amt: "140", price: 2.59 },
    { amt: "170", price: 3.19 },
    { amt: "172", price: 2.49 },
    { amt: "240", price: 4.59 },
    { amt: "257", price: 3.69 },
    { amt: "284", price: 5.19 },
    { amt: "296", price: 5.59 },
    { amt: "355", price: 6.29 },
    { amt: "429", price: 5.99 },
    { amt: "570", price: 9.69 },
    { amt: "706", price: 9.89, hot: true },
    { amt: "716", price: 12.49 },
    { amt: "1084", price: 18.59 },
    { amt: "1163", price: 20.69 },
    { amt: "1446", price: 24.29 },
    { amt: "2010", price: 32.69 },
    { amt: "2195", price: 29.79 },
    { amt: "2398", price: 35.79 },
    { amt: "2976", price: 48.79 },
    { amt: "3688", price: 49.49 },
    { amt: "5532", price: 74.29 },
    { amt: "7502", price: 121.59 },
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
    { amt: "11500", price: 97.59 },
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
    { amt: "11", price: 0.29 },
    { amt: "12", price: 0.22 },
    { amt: "19", price: 0.39 },
    { amt: "22", price: 0.49 },
    { amt: "28", price: 0.59 },
    { amt: "44", price: 0.89 },
    { amt: "56", price: 1.09 },
    { amt: "59", price: 0.99 },
    { amt: "85", price: 1.49 },
    { amt: "86", price: 1.29 },
    { amt: "112", price: 1.89 },
    { amt: "165", price: 2.59 },
    { amt: "170", price: 2.99 },
    { amt: "172", price: 2.45 },
    { amt: "223", price: 3.69 },
    { amt: "240", price: 4.29 },
    { amt: "257", price: 3.89 },
    { amt: "275", price: 4.19 },
    { amt: "296", price: 5.09 },
    { amt: "336", price: 5.49 },
    { amt: "344", price: 5.19 },
    { amt: "408", price: 6.89 },
    { amt: "516", price: 7.59 },
    { amt: "565", price: 8.09 },
    { amt: "568", price: 9.49 },
    { amt: "570", price: 8.99 },
    { amt: "706", price: 9.85, hot: true },
    { amt: "875", price: 14.49 },
    { amt: "1060", price: 15.29 },
    { amt: "1163", price: 17.89 },
    { amt: "1346", price: 18.79 },
    { amt: "1825", price: 24.59 },
    { amt: "2010", price: 31.39 },
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
    { amt: "1100", price: 8.09, hot: true },
    { amt: "2260", price: 16.09 },
    { amt: "5800", price: 39.09 },
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
  // Robux the buyer receives. The team buys the buyer's Game Pass, priced by robloxGamePassPrice.
  roblox: [
    { amt: "80", price: 1.59 },
    { amt: "500", price: 9.89 },
    { amt: "1000", price: 19.69, hot: true },
    { amt: "2000", price: 39.29 },
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
    { label: "Weekly Elite Pack", price: 1.09, img: mlbbWeeklyX3 },
    { label: "Monthly Elite Pack", price: 4.09 },
    { label: "Twilight Pass", price: 8.39, img: mlbbTwilight },
    { label: "First Top-Up 50 + 5", price: 0.99 },
    { label: "First Top-Up 150 + 15", price: 2.49 },
    { label: "First Top-Up 250 + 25", price: 3.89 },
    { label: "First Top-Up 500 + 65", price: 7.69 },
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
  pubg: [
    { label: "First Purchase Pack", price: 1.19 },
    { label: "Weekly Deal Pack 1", price: 1.09 },
    { label: "Weekly Deal Pack 2", price: 2.89 },
    { label: "Upgradable Firearm Materials Pack", price: 2.89 },
    { label: "Weekly Mythic Emblem Pack", price: 2.89 },
    { label: "Mythic Emblem Pack", price: 4.89 },
    { label: "Prime 1 Month", price: 1.19 },
    { label: "Prime 3 Months", price: 2.99 },
    { label: "Prime 6 Months", price: 5.79 },
    { label: "Prime 12 Months", price: 11.49 },
    { label: "Prime Plus 1 Month", price: 9.59 },
    { label: "Prime Plus 3 Months", price: 27.99 },
    { label: "Prime Plus 6 Months", price: 55.19 },
    { label: "Prime Plus 12 Months", price: 111.39 },
    { label: "Elite Pass LV1-50", price: 5.79 },
    { label: "Elite Pass LV1-100", price: 11.59 },
    { label: "Elite Pass Plus LV1-100", price: 26.89 },
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
    { label: "Season Pass", price: 0.99 },
    { label: "Level Up Pass", price: 1.79 },
    { label: "Strike Pass Elite", price: 3.49 },
    { label: "Strike Pass Premium", price: 7.59 },
    { label: "Ultra Skin Lucky Chest", price: 0.49 },
    { label: "Lucky Bag Week", price: 0.99 },
    { label: "$0.49 Deal", price: 0.49 },
    { label: "$0.99 Deal", price: 0.99 },
    { label: "$1.99 Deal", price: 1.79 },
    { label: "$2.99 Deal", price: 2.69 },
    { label: "$3.99 Deal", price: 3.49 },
    { label: "$4.99 Deal", price: 4.39 },
    { label: "$5.99 Deal", price: 5.19 },
    { label: "$6.99 Deal", price: 5.89 },
    { label: "$7.99 Deal", price: 6.69 },
    { label: "$8.99 Deal", price: 7.59 },
    { label: "$9.99 Deal", price: 8.39 },
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
  ownerEmail: "yurictopup@gmail.com",
};

export function isOwner(email: string | null | undefined): boolean {
  return email?.toLowerCase() === store.ownerEmail.toLowerCase();
}
