export type IdField = { label: string; placeholder: string; numeric?: boolean; options?: readonly string[] };
export type IdConfig = { primary: IdField; secondary?: IdField; requiresLookup?: boolean };

const hoyoServers = ["Asia", "America", "Europe", "TW, HK, MO"] as const;
const hoyoIdConfig: IdConfig = {
  primary: { label: "UID", placeholder: "UID", numeric: true },
  secondary: { label: "Server", placeholder: "Select server", options: hoyoServers },
  requiresLookup: true,
};

export const idConfigs: Record<string, IdConfig> = {
  mlbb: { primary: { label: "User ID", placeholder: "User ID", numeric: true }, secondary: { label: "Zone ID", placeholder: "Zone ID", numeric: true }, requiresLookup: true },
  ff: { primary: { label: "Player ID", placeholder: "Player ID", numeric: true }, requiresLookup: true },
  pubg: { primary: { label: "Player ID", placeholder: "Player ID", numeric: true }, requiresLookup: true },
  hok: { primary: { label: "Player ID", placeholder: "Player ID", numeric: true }, requiresLookup: true },
  magicchess: { primary: { label: "User ID", placeholder: "User ID", numeric: true }, secondary: { label: "Zone ID", placeholder: "Zone ID", numeric: true }, requiresLookup: true },
  roblox: { primary: { label: "Username", placeholder: "Roblox Username" }, requiresLookup: true },
  codm: { primary: { label: "Player ID (UID)", placeholder: "Player ID (UID)", numeric: true }, requiresLookup: true },
  wildrift: { primary: { label: "Riot ID", placeholder: "Riot ID" }, secondary: { label: "Tagline", placeholder: "#XXXX" }, requiresLookup: true },
  bloodstrike: { primary: { label: "User ID", placeholder: "User ID", numeric: true }, requiresLookup: true },
  coc: { primary: { label: "Player Tag", placeholder: "#XXXXXX" }, requiresLookup: true },
  genshin: hoyoIdConfig,
  starrail: hoyoIdConfig,
};

export function getIdConfig(gameId: string): IdConfig {
  return idConfigs[gameId] ?? {
    primary: { label: "User ID", placeholder: "User ID", numeric: true },
    secondary: { label: "Zone ID (optional)", placeholder: "Zone ID (optional)", numeric: true },
  };
}

export function validatePlayerId(gameId: string, primary: string, secondary = ""): string | null {
  const id = primary.trim();
  if (gameId === "genshin" || gameId === "starrail") {
    if (!/^\d+$/.test(id)) return "UID must be numeric.";
    return hoyoServers.some((server) => server === secondary) ? null : "Please select a server.";
  }
  if (gameId === "roblox") return /^[a-zA-Z0-9_]+$/.test(id) ? null : "Please enter your Roblox username.";
  if (gameId === "mlbb" || gameId === "magicchess") {
    if (!/^\d+$/.test(id)) return "User ID must be numeric.";
    return /^\d+$/.test(secondary.trim()) ? null : "Please enter a numeric Zone ID.";
  }
  if (gameId === "wildrift") {
    if (!id || id.includes("#")) return "Enter your Riot ID and put the tagline in the second field.";
    if (!/^#?[a-zA-Z0-9]+$/.test(secondary.trim())) return "Enter a tagline like #XXXX.";
    return null;
  }
  if (gameId === "coc") {
    return /^#[A-Z0-9]+$/i.test(id) ? null : "Player Tag must start with #.";
  }
  if (["codm", "bloodstrike", "ff", "pubg", "hok"].includes(gameId)) {
    return /^\d+$/.test(id) ? null : "ID must be numeric.";
  }
  return /^\d{4,12}$/.test(id) ? null : "ID must be 4-12 digits.";
}
