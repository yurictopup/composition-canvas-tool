import { describe, expect, it } from "vitest";
import { cleanReply, gamesInChat, modelMessages, MAX_TURNS, systemPrompt } from "@/lib/chatAi";

describe("gamesInChat", () => {
  it("finds games in Khmer and English, newest first", () => {
    const turns = [
      { role: "user" as const, text: "តម្លៃ Free Fire ប៉ុន្មាន?" },
      { role: "bot" as const, text: "..." },
      { role: "user" as const, text: "ចុះ mlbb វិញ?" },
    ];
    expect(gamesInChat(turns)).toEqual(["mlbb", "ff"]);
  });
});

describe("systemPrompt", () => {
  it("lists live prices only for the games asked about", () => {
    const prompt = systemPrompt({ mlbb: [{ amt: "86", price: 1.25 }] });
    expect(prompt).toContain("86 Diamonds = $1.25");
    expect(prompt).toContain("User ID + Zone ID");
    expect(prompt).not.toContain("Robux =");
    expect(prompt).toContain("@Yuricccc");
  });

  it("falls back to package names when no live price is known", () => {
    expect(systemPrompt({ ff: [] })).toContain("price shown on the game page");
  });
});

describe("modelMessages", () => {
  it("keeps the system prompt and only the last turns", () => {
    const turns = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 ? "bot" : "user") as "user" | "bot",
      text: `m${i}`,
    }));
    const msgs = modelMessages(turns, "SYS");
    expect(msgs[0]).toEqual({ role: "system", content: "SYS" });
    expect(msgs).toHaveLength(MAX_TURNS + 1);
    expect(msgs.at(-1)).toEqual({ role: "assistant", content: "m19" });
  });
});

describe("cleanReply", () => {
  it("removes markdown, emoji and hidden reasoning", () => {
    expect(cleanReply("<think>x</think>**សួស្តី!** 👋\n* ជំហាន ១")).toBe("សួស្តី!\n- ជំហាន ១");
  });
});
