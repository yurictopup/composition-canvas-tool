import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KhqrCode } from "@/components/KhqrCode";
import { checkNbcTest, createNbcTest } from "@/lib/nbc-test.functions";

// Owner-only trial of the NBC token (see src/lib/nbc-test.server.ts). It is
// not linked from the store and creates no orders.
export const Route = createFileRoute("/nbc-test")({
  head: () => ({ meta: [{ title: "NBC test — Yuric Topup" }, { name: "robots", content: "noindex" }] }),
  component: NbcTest,
});

type Created = Awaited<ReturnType<typeof createNbcTest>>;
type Checked = Awaited<ReturnType<typeof checkNbcTest>>;

function Row({ label, got, want }: { label: string; got: unknown; want?: unknown }) {
  const same = want === undefined || String(got).toLowerCase() === String(want).toLowerCase();
  return (
    <tr className="border-t border-slate-200">
      <td className="py-1 pr-3 text-slate-500">{label}</td>
      <td className="py-1 pr-3 font-mono">{String(got ?? "—")}</td>
      <td className={`py-1 font-semibold ${same ? "text-green-600" : "text-red-600"}`}>
        {want === undefined ? "" : same ? "OK" : `expected ${String(want)}`}
      </td>
    </tr>
  );
}

function NbcTest() {
  const [amount, setAmount] = useState("0.01");
  // Another KHQR's md5 to check, e.g. one made before "Make KHQR" was pressed again.
  const [otherMd5, setOtherMd5] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [checks, setChecks] = useState<Checked[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const value = Number(amount);
  const qr = created?.ok ? created : null;

  return (
    <main className="mx-auto my-4 max-w-xl space-y-4 rounded-2xl bg-white p-4 text-sm text-slate-800">
      <h1 className="text-xl font-bold">NBC token test</h1>
      <p className="text-slate-600">
        Pays your own Bakong account a small amount with the NBC token. Live payments keep using
        the current setup. No order is created and nothing is bought.{" "}
        <Link to="/admin" className="text-blue-600 underline">
          Admin
        </Link>
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="amount">Amount (USD)</label>
        <input
          id="amount"
          type="number"
          min="0.01"
          max="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 rounded border px-2 py-1"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              setChecks([]);
              setCreated(await createNbcTest({ data: { amount: value } }));
            })
          }
          className="rounded bg-blue-600 px-3 py-1 font-semibold text-white disabled:opacity-50"
        >
          1. Make KHQR
        </button>
      </div>

      {error && <p className="rounded bg-red-50 p-2 text-red-700">{error}</p>}
      {created && !created.ok && <p className="rounded bg-yellow-50 p-2">{created.message}</p>}

      {qr && (
        <section className="space-y-3 rounded-xl border p-3">
          <KhqrCode value={qr.qr} size={220} />
          <table className="w-full text-left">
            <tbody>
              <Row label="Receiving account" got={qr.fields.accountId} want={qr.expected.accountId} />
              <Row label="Name shown" got={qr.fields.merchantName} want={qr.expected.merchantName} />
              <Row label="Currency" got={qr.fields.currency} want={qr.expected.currency} />
              <Row label="Amount" got={qr.fields.amount} want={String(qr.expected.amount)} />
              <Row label="Bill number" got={qr.fields.billNumber} />
              <Row label="QR expires" got={qr.expiresAt} />
              <Row label="Token expires" got={qr.tokenExpires} />
              <Row label="Cloudflare data center" got={qr.colo} />
            </tbody>
          </table>
          <p className="text-slate-600">
            2. Scan and pay with your bank app, then check. Check again after paying to see that
            the same payment gives the same transaction.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const md5 = otherMd5.trim().toLowerCase() || qr.md5;
                  const result = await checkNbcTest({ data: { md5, amount: value } });
                  setChecks((list) => [result, ...list]);
                })
              }
              className="rounded bg-green-600 px-3 py-1 font-semibold text-white disabled:opacity-50"
            >
              Check payment
            </button>
            <input
              aria-label="Other KHQR md5 (optional)"
              placeholder="other md5 (optional)"
              value={otherMd5}
              onChange={(e) => setOtherMd5(e.target.value)}
              className="w-72 rounded border px-2 py-1 font-mono text-xs"
            />
          </div>
        </section>
      )}

      {checks.map((c, i) => (
        <section key={checks.length - i} className="rounded-xl border p-3">
          <h2 className="font-semibold">Check #{checks.length - i}</h2>
          {!c.ok ? (
            <p>{c.message}</p>
          ) : (
            <table className="w-full text-left">
              <tbody>
                <Row label="Result" got={c.status} />
                <Row label="NBC said" got={c.nbc} />
                <Row label="KHQR md5" got={c.md5} />
                {"message" in c && <Row label="Message" got={c.message} />}
                {"matches" in c && (
                  <>
                    <Row label="Paid amount" got={c.amount} want={value} />
                    <Row label="Currency" got={c.currency} want="USD" />
                    <Row label="Paid to" got={c.toAccountId} want={qr?.expected.accountId} />
                    <Row label="Transaction (end)" got={c.hashEnd} />
                    <Row label="Store would accept it" got={c.matches ? "yes" : "no"} want="yes" />
                    <Row label="Orders already using it" got={c.ordersWithThisHash} want={0} />
                  </>
                )}
                <Row label="Cloudflare data center" got={c.colo} />
              </tbody>
            </table>
          )}
        </section>
      ))}
    </main>
  );
}
