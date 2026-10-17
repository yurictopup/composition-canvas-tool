import mlbb from "@/assets/mlbb.png.asset.json";
import freefire from "@/assets/freefire.png.asset.json";
import roblox from "@/assets/roblox.png.asset.json";
import magicchess from "@/assets/magicchess.png.asset.json";
import pubg from "@/assets/pubg.png.asset.json";
import hok from "@/assets/hok.png.asset.json";

export const games = [
  { id: "mlbb", name: "Mobile Legends", icon: mlbb.url, unit: "Diamonds", blurb: "ពេជ្រ MLBB ចូលភ្លាមៗ" },
  { id: "ff", name: "Free Fire", icon: freefire.url, unit: "Diamonds", blurb: "ពេជ្រ Free Fire តម្លៃថោក" },
  { id: "roblox", name: "Roblox", icon: roblox.url, unit: "Robux", blurb: "Robux ចូលលឿន" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess.url, unit: "Diamonds", blurb: "Magic Chess ចូលភ្លាម" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg.url, unit: "UC", blurb: "UC PUBG ចូលលឿន" },
  { id: "hok", name: "Honor of Kings", icon: hok.url, unit: "Tokens", blurb: "Tokens HoK ចូលភ្លាម" },
];

export type Game = (typeof games)[number];

export function findGame(id: string | undefined): Game | undefined {
  return games.find((g) => g.id === id);
}

export const packages = [
  { amt: 86, price: 1.5 },
  { amt: 172, price: 3 },
  { amt: 257, price: 4.5 },
  { amt: 344, price: 6 },
  { amt: 514, price: 9 },
  { amt: 706, price: 12, hot: true },
  { amt: 1412, price: 24 },
  { amt: 2195, price: 36 },
  { amt: 3688, price: 60 },
];

export const payments = ["ABA KHQR", "Wing", "ACLEDA", "Bakong"];

export const store = {
  name: "Yuric Topup",
  telegram: "@yuric_topup",
  hours: "24 ម៉ោង",
};
