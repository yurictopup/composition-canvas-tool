import { describe, expect, it, vi } from "vitest";
import { buildKhqr, crc16, formatKhqrAmount } from "@/lib/khqr";
import { checkBakongPayment, createPaymentQr, md5, paymentMatches } from "@/lib/bakong";

describe("KHQR payload", () => {
  it("uses CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("formats amounts without trailing zeros", () => {
    expect(formatKhqrAmount(1.09)).toBe("1.09");
    expect(formatKhqrAmount(2.5)).toBe("2.5");
    expect(formatKhqrAmount(10)).toBe("10");
  });

  it("matches the bakong-khqr SDK output byte for byte", () => {
    // Reference: bakong-khqr 0.6.5 create_qr(amount=1.09, account_id="brachnha_say@bkrt",
    // merchant_name="Yuric Topup", merchant_city="Phnom Penh", currency="USD",
    // bill_number="AB12CD34") with time fixed at 1761465600 and 1 day expiry.
    const qr = buildKhqr({
      accountId: "brachnha_say@bkrt",
      merchantName: "Yuric Topup",
      amount: 1.09,
      currency: "USD",
      billNumber: "AB12CD34",
      createdAt: 1761465600000,
      expiresAt: 1761552000000,
    });
    expect(qr).toBe(
      "00020101021229210017brachnha_say@bkrt52045999530384054041.095802KH5911Yuric Topup6010Phnom Penh62120108AB12CD349934001317614656000000113176155200000063041831",
    );
    expect(md5(qr)).toBe("c4403968073bb968bb26b3ca3dfb3115");
  });
});

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const nbc = { token: "eyJtest", accountId: "brachnha_say@bkrt", merchantName: "Yuric Topup" };

describe("Bakong payment check", () => {
  it("builds the QR locally for an NBC token", async () => {
    const f = fakeFetch(200, {});
    const qr = await createPaymentQr(
      { ...nbc, fetchImpl: f },
      { amount: 1.09, billNumber: "AB12CD34" },
      1761465600000,
    );
    expect(qr.qr).toContain("0017brachnha_say@bkrt");
    expect(qr.md5).toBe(md5(qr.qr));
    expect(f).not.toHaveBeenCalled();
  });

  it("asks KHQR.dev to build the QR for an rbk token", async () => {
    const f = fakeFetch(200, { responseCode: 0, data: { qr: "000201...", md5: "abc" } });
    const qr = await createPaymentQr(
      { ...nbc, token: "rbk_test", fetchImpl: f },
      { amount: 1.09, billNumber: "AB12CD34" },
    );
    expect(qr).toMatchObject({ qr: "000201...", md5: "abc" });
    expect(String(f.mock.calls[0]![0])).toBe("https://api.khqr.dev/v1/generate_qr");
  });

  it("reads a paid transaction", async () => {
    const f = fakeFetch(200, {
      responseCode: 0,
      data: { hash: "h1", amount: 1.09, currency: "USD", toAccountId: "brachnha_say@bkrt" },
    });
    const check = await checkBakongPayment({ ...nbc, fetchImpl: f }, "m");
    expect(check).toEqual({
      status: "paid",
      amount: 1.09,
      currency: "USD",
      toAccountId: "brachnha_say@bkrt",
      hash: "h1",
    });
    expect(String(f.mock.calls[0]![0])).toBe(
      "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5",
    );
  });

  it("treats not found as unpaid and a blocked IP as unavailable", async () => {
    expect(
      await checkBakongPayment(
        { ...nbc, fetchImpl: fakeFetch(200, { responseCode: 1, data: null }) },
        "m",
      ),
    ).toEqual({
      status: "unpaid",
    });
    expect((await checkBakongPayment({ ...nbc, fetchImpl: fakeFetch(403, {}) }, "m")).status).toBe(
      "unavailable",
    );
  });

  it("uses BAKONG_API_URL when set, e.g. a proxy in Cambodia", async () => {
    const f = fakeFetch(200, { responseCode: 1 });
    await checkBakongPayment({ ...nbc, apiUrl: "https://kh-proxy.example/v1/", fetchImpl: f }, "m");
    expect(String(f.mock.calls[0]![0])).toBe(
      "https://kh-proxy.example/v1/check_transaction_by_md5",
    );
  });

  it("does not count a scanned-but-unpaid KHQR.dev answer", async () => {
    const f = fakeFetch(200, { responseCode: 0, data: { status: "SCANNED" } });
    expect(await checkBakongPayment({ ...nbc, token: "rbk_x", fetchImpl: f }, "m")).toEqual({
      status: "unpaid",
    });
  });
});

describe("Matching a payment to the order", () => {
  const paid = {
    status: "paid" as const,
    amount: 1.09,
    currency: "USD",
    toAccountId: "brachnha_say@bkrt",
    hash: null,
  };
  const expected = { amount: 1.09, accountId: "brachnha_say@bkrt" };
  it("accepts the full amount to our account", () => {
    expect(paymentMatches(paid, expected)).toBe(true);
  });
  it("rejects a short payment, another currency, another account or a missing amount", () => {
    expect(paymentMatches({ ...paid, amount: 1.0 }, expected)).toBe(false);
    expect(paymentMatches({ ...paid, currency: "KHR" }, expected)).toBe(false);
    expect(paymentMatches({ ...paid, toAccountId: "someone@aclb" }, expected)).toBe(false);
    expect(paymentMatches({ ...paid, amount: null }, expected)).toBe(false);
  });
  it("skips the account check when the QR came from KHQR.dev", () => {
    const relay = { amount: 1.09, accountId: null };
    expect(paymentMatches({ ...paid, toAccountId: "shop@abaa" }, relay)).toBe(true);
    expect(paymentMatches({ ...paid, toAccountId: "shop@abaa", amount: 1.0 }, relay)).toBe(false);
  });
});
