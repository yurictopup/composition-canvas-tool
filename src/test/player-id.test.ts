import { describe, expect, it } from "vitest";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";

describe("Game-specific player identifiers", () => {
  it("CODM uses numeric Player UID", () => {
    expect(getIdConfig("codm").primary.label).toBe("Player ID (UID)");
    expect(getIdConfig("codm").secondary).toBeUndefined();
    expect(validatePlayerId("codm", "6741234567890123456")).toBeNull();
    expect(validatePlayerId("codm", "Player#123")).not.toBeNull();
  });
  it("Wild Rift needs both Riot ID and Tagline", () => {
    expect(getIdConfig("wildrift").secondary?.label).toBe("Tagline");
    expect(validatePlayerId("wildrift", "Yuric", "#XXXX")).toBeNull();
    expect(validatePlayerId("wildrift", "Yuric", "")).not.toBeNull();
    expect(validatePlayerId("wildrift", "", "#XXXX")).not.toBeNull();
  });
  it("Blood Strike uses numeric User ID", () => {
    expect(getIdConfig("bloodstrike").primary.label).toBe("User ID");
    expect(validatePlayerId("bloodstrike", "1234567890")).toBeNull();
    expect(validatePlayerId("bloodstrike", "abc")).not.toBeNull();
  });
  it("Clash of Clans uses a hash-prefixed Player Tag", () => {
    expect(getIdConfig("coc").primary.label).toBe("Player Tag");
    expect(validatePlayerId("coc", "#XXXXXX")).toBeNull();
    expect(validatePlayerId("coc", "XXXXXX")).not.toBeNull();
  });
  it("all four games require real lookup rather than format-only verification", () => {
    for (const id of ["codm", "wildrift", "bloodstrike", "coc"]) {
      expect(getIdConfig(id).requiresLookup).toBe(true);
    }
  });
});