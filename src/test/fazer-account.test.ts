import { describe, expect, it } from "vitest";
import { fetchFazerAccount } from "@/lib/fazercards";

describe("fetchFazerAccount", () => {
  it("reads balance and plan", async () => {
    const fetchImpl = (async (url: string) => {
      const body = String(url).endsWith("/balance")
        ? { ok: true, balance: "12.50", currency: "USD" }
        : { ok: true, plan: "trial", planExpiresAt: "2026-11-01T00:00:00Z", subscriptionActive: true };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const acc = await fetchFazerAccount({ apiKey: "test", fetchImpl });
    expect(acc).toEqual({
      balance: 12.5,
      currency: "USD",
      plan: "trial",
      planExpiresAt: "2026-11-01T00:00:00Z",
      subscriptionActive: true,
    });
  });
});
