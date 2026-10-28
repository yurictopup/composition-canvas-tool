import { describe, expect, it, vi } from "vitest";
import {
  checkPaywayTransaction,
  createPaywayQr,
  formatAmount,
  makeTranId,
  paywayHash,
  reqTime,
  type PaywayConfig,
} from "@/lib/payway";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const NOW = Date.UTC(2026, 9, 28, 10, 0, 0);
const ORDER_ID = "3c82a19d-0000-4000-8000-000000000001";
const cfg: PaywayConfig = {
  env: "sandbox",
  merchantId: "ec000002",
  apiKey: "test-api-key",
  merchantName: "YURIC SHOP",
};

function sentBody(f: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = f.mock.calls[0]![1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

describe("PayWay signing", () => {
  it("formats req_time as UTC YYYYMMDDHHmmss", () => {
    expect(reqTime(NOW)).toBe("20261028100000");
  });

  it("makes a new tran_id of at most 20 characters", () => {
    expect(makeTranId(ORDER_ID, NOW)).toBe("3C82A19DMVRY0XS0");
    expect(makeTranId(ORDER_ID, NOW).length).toBeLessThanOrEqual(20);
    expect(makeTranId(ORDER_ID, NOW + 1)).not.toBe(makeTranId(ORDER_ID, NOW));
  });

  it("spells amounts with two decimals", () => {
    expect(formatAmount(1.09)).toBe("1.09");
    expect(formatAmount(2.5)).toBe("2.50");
    expect(formatAmount(0.1 + 0.2)).toBe("0.30");
  });

  it("matches the docs' check-transaction example, checked with Python hmac", async () => {
    expect(await paywayHash("test-api-key", ["20250213065545", "ec000002", "17394277693"])).toBe(
      "p3j8kFc3QW+geJBr/TO7cPVRVr1S590g1RVgoiBi6M9ht5Frs7eQG1bZufdl3NRDons0b7/CjT/AVIOrFnZxqg==",
    );
  });
});

describe("PayWay generate-qr", () => {
  it("signs the fields in the documented order and returns the QR", async () => {
    const f = fakeFetch(200, {
      qrString: "00020101021230510016abaakhppxxx@abaa",
      status: { code: "0", message: "Success." },
    });
    const qr = await createPaywayQr(
      { ...cfg, fetchImpl: f },
      { orderId: ORDER_ID, amount: 1.09 },
      NOW,
    );
    expect(String(f.mock.calls[0]![0])).toBe(
      "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr",
    );
    const body = sentBody(f);
    expect(body).toMatchObject({
      req_time: "20261028100000",
      merchant_id: "ec000002",
      tran_id: "3C82A19DMVRY0XS0",
      amount: 1.09,
      payment_option: "abapay_khqr",
      currency: "USD",
      lifetime: 30,
      qr_image_template: "template3_color",
    });
    // Python: req_time+merchant_id+tran_id+amount+payment_option+currency+lifetime+template
    expect(body["hash"]).toBe(
      "q1n4SZteq4yzjikDLzLtUG6aTYLBnjyCIvk+GsypS3Jyi8insKe9noln5f7dil8m88y7SDEUdUPnGn+iMd98qA==",
    );
    expect(body).not.toHaveProperty("api_key");
    expect(qr).toEqual({
      qr: "00020101021230510016abaakhppxxx@abaa",
      tranId: "3C82A19DMVRY0XS0",
      expiresAt: NOW + 30 * 60_000,
    });
  });

  it("uses the production host only when asked", async () => {
    const f = fakeFetch(200, { qrString: "x", status: { code: "0" } });
    await createPaywayQr(
      { ...cfg, env: "production", fetchImpl: f },
      { orderId: ORDER_ID, amount: 1 },
      NOW,
    );
    expect(String(f.mock.calls[0]![0])).toMatch(/^https:\/\/checkout\.payway\.com\.kh\//);
  });

  it("throws with PayWay's code when it refuses", async () => {
    const f = fakeFetch(200, { status: { code: "1", message: "Wrong hash" } });
    await expect(
      createPaywayQr({ ...cfg, fetchImpl: f }, { orderId: ORDER_ID, amount: 1 }, NOW),
    ).rejects.toThrow(/code 1: Wrong hash/);
  });
});

describe("PayWay check-transaction-2", () => {
  const approved = {
    data: {
      payment_status_code: 0,
      total_amount: 1.09,
      original_amount: 1.09,
      refund_amount: 0,
      payment_amount: 1.09,
      payment_currency: "USD",
      apv: "753786",
      payment_status: "APPROVED",
    },
    status: { code: "00", message: "Success!" },
  };

  it("signs req_time + merchant_id + tran_id", async () => {
    const f = fakeFetch(200, approved);
    await checkPaywayTransaction({ ...cfg, fetchImpl: f }, "3C82A19DMVRY0XS0", NOW);
    expect(String(f.mock.calls[0]![0])).toBe(
      "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2",
    );
    expect(sentBody(f)).toEqual({
      req_time: "20261028100000",
      merchant_id: "ec000002",
      tran_id: "3C82A19DMVRY0XS0",
      hash: "ejmH4+JSWENP/KniKiV7UrnxP7JheSRtvtHj4QY5DBpRH3jQFoT60bSbej0CzZ4uT0ipcxMiPdNv2l7+WEDzzA==",
    });
  });

  it("reads an APPROVED payment", async () => {
    const check = await checkPaywayTransaction(
      { ...cfg, fetchImpl: fakeFetch(200, approved) },
      "T1",
    );
    expect(check).toEqual({
      status: "paid",
      amount: 1.09,
      currency: null,
      toAccountId: null,
      hash: "payway:T1:753786",
    });
  });

  it("compares the USD total when the payer paid in KHR", async () => {
    const khr = {
      ...approved,
      data: { ...approved.data, payment_amount: 4450, payment_currency: "KHR" },
    };
    const check = await checkPaywayTransaction({ ...cfg, fetchImpl: fakeFetch(200, khr) }, "T1");
    expect(check).toMatchObject({ status: "paid", amount: 1.09 });
  });

  it.each([
    ["PENDING", 2],
    ["DECLINED", 3],
    ["REFUNDED", 4],
    ["CANCELLED", 7],
    ["PRE-AUTH", 0],
  ])("treats %s as not paid", async (status, code) => {
    const body = {
      ...approved,
      data: { ...approved.data, payment_status: status, payment_status_code: code },
    };
    const check = await checkPaywayTransaction({ ...cfg, fetchImpl: fakeFetch(200, body) }, "T1");
    expect(check).toEqual({ status: "unpaid" });
  });

  it("treats a partly refunded payment as not paid", async () => {
    const body = { ...approved, data: { ...approved.data, refund_amount: 0.5 } };
    const check = await checkPaywayTransaction({ ...cfg, fetchImpl: fakeFetch(200, body) }, "T1");
    expect(check).toEqual({ status: "unpaid" });
  });

  it("treats 'not found' as not paid yet", async () => {
    const f = fakeFetch(200, { status: { code: "6", message: "Transaction not found" } });
    expect(await checkPaywayTransaction({ ...cfg, fetchImpl: f }, "T1")).toEqual({
      status: "unpaid",
    });
  });

  it("never counts a wrong hash or server error as paid", async () => {
    for (const [http, body] of [
      [200, { status: { code: "5", message: "Invalid hash" } }],
      [500, null],
    ] as const) {
      const check = await checkPaywayTransaction(
        { ...cfg, fetchImpl: fakeFetch(http, body) },
        "T1",
      );
      expect(check.status).toBe("unavailable");
    }
  });

  it("reports a network failure as unavailable", async () => {
    const f = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await checkPaywayTransaction({ ...cfg, fetchImpl: f }, "T1")).toEqual({
      status: "unavailable",
      message: "timeout",
    });
  });
});
