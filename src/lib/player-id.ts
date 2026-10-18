export type IdField = { label: string; placeholder: string; numeric?: boolean };
export type IdConfig = { primary: IdField; secondary?: IdField; requiresLookup?: boolean };

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
};

export function getIdConfig(gameId: string): IdConfig {
  return idConfigs[gameId] ?? {
    primary: { label: "User ID", placeholder: "User ID", numeric: true },
    secondary: { label: "Zone ID (បើមាន)", placeholder: "Zone ID (បើមាន)", numeric: true },
  };
}

export function validatePlayerId(gameId: string, primary: string, secondary = ""): string | null {
  const id = primary.trim();
  if (gameId === "roblox") return /^[a-zA-Z0-9_]+$/.test(id) ? null : "សូមបញ្ចូល Roblox Username។";
  if (gameId === "mlbb" || gameId === "magicchess") {
    if (!/^\d+$/.test(id)) return "User ID ត្រូវតែជាលេខ។";
    return /^\d+$/.test(secondary.trim()) ? null : "សូមបញ្ចូល Zone ID ជាលេខ។";
  }
  if (gameId === "wildrift") {
    if (!id || id.includes("#")) return "សូមបញ្ចូល Riot ID ហើយដាក់ Tagline នៅប្រអប់ផ្សេង។";
    if (!/^#?[a-zA-Z0-9]+$/.test(secondary.trim())) return "សូមបញ្ចូល Tagline ដូចជា #XXXX។";
    return null;
  }
  if (gameId === "coc") {
    return /^#[A-Z0-9]+$/i.test(id) ? null : "សូមបញ្ចូល Player Tag ដោយចាប់ផ្ដើមជាមួយ #។";
  }
  if (["codm", "bloodstrike", "ff", "pubg", "hok"].includes(gameId)) {
    return /^\d+$/.test(id) ? null : "ID ត្រូវតែជាលេខ។";
  }
  return /^\d{4,12}$/.test(id) ? null : "ID ត្រូវជាលេខ 4 ដល់ 12 ខ្ទង់។";
}