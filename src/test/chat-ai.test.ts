import { describe, expect, it } from "vitest";
import {
  answerText,
  botModels,
  cleanReply,
  gamesInChat,
  modelMessages,
  MAX_TURNS,
  orderReply,
  ordersSection,
  systemPrompt,
} from "@/lib/chatAi";
import { answer, isOrderQuestion } from "@/lib/chatBrain";

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
  it("drops the Khmer full stop sign", () => {
    expect(cleanReply("សួស្តី។ ខ្ញុំជា Yuric Bot។")).toBe("សួស្តី ខ្ញុំជា Yuric Bot");
  });

  it("removes markdown, emoji and hidden reasoning", () => {
    expect(cleanReply("<think>x</think>**សួស្តី!** 👋\n* ជំហាន ១")).toBe("សួស្តី!\n- ជំហាន ១");
  });
});

describe("order questions", () => {
  it("treats 'paid but no diamonds' as an order problem with admin steps", () => {
    const q = "ហេតុអ្វីបង់លុយជោគជ័យហើយអតមាន ពេជ្រចូល";
    expect(isOrderQuestion(q)).toBe(true);
    const reply = answer(q);
    expect(reply.text).toContain("Profile");
    expect(reply.actions?.[0]?.href).toContain("t.me");
  });

  it("tells the AI whether the money arrived for each order", () => {
    const base = {
      game: "Mobile Legends",
      pack: "86 Diamonds",
      price: 1.25,
      playerId: "123 (4567)",
      minutesAgo: 3,
      status: "pending",
      qrExpired: false,
    };
    const text = ordersSection([
      { ...base, code: "AAAA1111", paid: true },
      { ...base, code: "BBBB2222", paid: false },
    ]);
    expect(text).toContain("Order AAAA1111");
    expect(text).toMatch(/AAAA1111.*PAYMENT RECEIVED.*paid, waiting for delivery/);
    expect(text).toMatch(/BBBB2222.*NOT PAID YET/);
    expect(ordersSection(null)).toContain("not signed in");
    expect(ordersSection(undefined)).toBe("");
  });
});

describe("model answers", () => {
  it("reads Workers AI and OpenAI-style answers", () => {
    expect(answerText({ response: "hi" })).toBe("hi");
    expect(answerText({ choices: [{ message: { content: "hey" } }] })).toBe("hey");
    expect(answerText({})).toBe("");
  });

  it("tries the override first, then the default models, without repeats", () => {
    expect(botModels("@cf/x")[0]).toBe("@cf/x");
    expect(botModels("")).toHaveLength(2);
  });
});

describe("orderReply (no AI)", () => {
  const base = {
    code: "AB12CD34",
    game: "Mobile Legends",
    pack: "86 Diamonds",
    price: 1.25,
    playerId: "123 (4567)",
    minutesAgo: 3,
    status: "pending",
    qrExpired: false,
  };

  it("says the money arrived and delivery is on its way", () => {
    const text = orderReply([{ ...base, paid: true }]);
    expect(text).toContain("AB12CD34");
    expect(text).toContain("ប្រាក់របស់អ្នកបានចូលហើយ");
    expect(text).not.toContain("។");
  });

  it("says no money yet and points to the admin", () => {
    const text = orderReply([{ ...base, paid: false }]);
    expect(text).toContain("មិនទាន់ឃើញប្រាក់ចូល");
    expect(text).toContain("@Yuricccc");
  });

  it("asks guests to sign in", () => {
    expect(orderReply(null)).toContain("Sign In");
  });
});
