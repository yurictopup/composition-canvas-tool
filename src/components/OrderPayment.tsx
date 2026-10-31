import { useEffect, useState, type ReactNode } from "react";
import { Check, Clock, Copy, ExternalLink, Gift, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { KhqrCode } from "@/components/KhqrCode";
import { checkPayment, startPayment } from "@/lib/payment.functions";
import { checkGuestPayment, startGuestPayment } from "@/lib/guest-order.functions";
import type { PaymentState } from "@/lib/payment.server";
import { useStorePrefs } from "@/lib/storePrefs";

const POLL_MS = 5000;
// Bakong can confirm a payment made in the last seconds a little after the QR
// expires, so the page keeps asking for a while longer.
const GRACE_MS = 3 * 60_000;

export type OrderSummary = {
  code: string;
  game: string;
  item: string;
  amount?: number | undefined;
  merchant?: string;
};

// Shows the order's own KHQR and waits for Bakong to confirm it. Once paid the
// QR is replaced by a check mark. Without Bakong set up on the server, the
// manual instructions (fallback) are shown. Guest orders pass their link token.
export function OrderPayment({
  orderId,
  guestToken,
  summary,
  fallback,
}: {
  orderId: string;
  guestToken?: string | null | undefined;
  summary: OrderSummary;
  fallback: ReactNode;
}) {
  const [state, setState] = useState<PaymentState | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (guestToken
      ? startGuestPayment({ data: { orderId, token: guestToken } })
      : startPayment({ data: { orderId } })
    )
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [orderId, guestToken]);

  const waiting = !!state?.available && !!state.qr && !state.paid;
  const stopped =
    waiting && !!state.expiresAt && new Date(state.expiresAt).getTime() + GRACE_MS < now;
  // Paid but not delivered yet: keep asking (no bank call any more) so the page shows
  // "delivered" and, for Roblox, the code as soon as it is ready.
  const delivering =
    !!state?.paid && !["completed", "failed", "refunded"].includes(state.status ?? "");

  useEffect(() => {
    if ((!waiting || stopped) && !delivering) return;
    const timer = setInterval(async () => {
      setNow(Date.now());
      try {
        const next = guestToken
          ? await checkGuestPayment({ data: { orderId, token: guestToken } })
          : await checkPayment({ data: { orderId } });
        if (next.paid) setState(next);
      } catch {
        // keep polling; a missed check is retried on the next tick
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, stopped, delivering, orderId, guestToken]);

  if (error || (state && !state.available)) return <>{fallback}</>;
  return <PaymentView state={state} now={now} summary={summary} />;
}

// The screen itself, kept apart from the polling so each state can be shown alone.
export function PaymentView({
  state,
  now,
  summary,
}: {
  state: PaymentState | null;
  now: number;
  summary: OrderSummary;
}) {
  const { t, lang } = useStorePrefs();

  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("Preparing KHQR…")}
      </div>
    );
  }

  if (state.paid) return <PaidView state={state} summary={summary} />;

  if (!state.qr) {
    return (
      <div className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
        {state.message ? t(state.message) : t("KHQR is not available for this order.")}
      </div>
    );
  }

  const msLeft = state.expiresAt ? new Date(state.expiresAt).getTime() - now : null;
  const expired = msLeft !== null && msLeft <= 0;
  const minutesLeft = msLeft !== null ? Math.max(0, Math.ceil(msLeft / 60000)) : null;
  const merchant = summary.merchant ?? "Yuric Topup";

  return (
    <div>
      <div className="mb-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("Order")} #{summary.code}
        </p>
        <h1 className="mt-1 font-sans text-xl font-bold leading-relaxed">
          {t("Scan to pay")}
        </h1>
        <p className="font-sans text-sm text-muted-foreground">
          {summary.game} · {summary.item}
        </p>
      </div>

      {/* On a phone: open the bank app with this payment ready, no screenshot needed. */}
      {state.appLink && !expired && (
        <div className="mx-auto mb-4 w-full max-w-[300px]">
          <a
            href={state.appLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B4F71] px-4 py-3.5 font-sans text-base font-bold text-white shadow-[0_6px_18px_rgb(11_79_113/0.35)] transition hover:brightness-110"
          >
            <ExternalLink className="h-5 w-5" />
            {lang === "km" ? "បើកកម្មវិធី ABA ដើម្បីបង់" : "Open ABA app to pay"}
          </a>
          <p className="mt-2 text-center font-sans text-[11px] text-muted-foreground">
            {lang === "km"
              ? "នៅលើកុំព្យូទ័រ? ស្កេន QR ខាងក្រោមជំនួសវិញ"
              : "On a computer? Scan the QR below instead."}
          </p>
        </div>
      )}

      {/* KHQR card, laid out like the official Bakong KHQR sticker */}
      <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl bg-white text-[#1a1a1a] shadow-[0_10px_30px_rgb(15_23_42/0.18)] ring-1 ring-black/5">
        <div className="relative flex h-12 items-center justify-center bg-[#E1232E]">
          <span className="text-lg font-extrabold tracking-[0.12em] text-white">KHQR</span>
          <span className="absolute -bottom-px right-0 h-4 w-8 bg-white [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </div>
        <div className="px-6 pt-4 text-left">
          <p className="text-sm font-medium text-[#555]">{merchant}</p>
          <p className="mt-0.5 text-[28px] font-bold leading-tight">
            {state.amount?.toFixed(2)}
            <span className="ml-1.5 text-sm font-semibold text-[#555]">USD</span>
          </p>
        </div>
        <div className="mx-0 my-4 border-t border-dashed border-[#d4d4d4]" />
        <div className="flex justify-center px-6 pb-6">
          {expired ? (
            <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-3 rounded-xl bg-[#f5f5f5] text-center">
              <Clock className="h-8 w-8 text-[#999]" />
              <p className="px-4 font-sans text-sm leading-relaxed text-[#555]">
                {t("This QR has expired")}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1232E] px-3 py-1.5 font-sans text-xs font-semibold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("Get a new QR")}
              </button>
            </div>
          ) : (
            <KhqrCode value={state.qr} size={220} />
          )}
        </div>
      </div>

      {!expired && (
        <div className="mt-5 flex flex-col items-center gap-1.5">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-sans text-xs font-medium text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("Waiting for payment")}
            {minutesLeft !== null && (
              <span className="text-muted-foreground">
                · {minutesLeft} {t("min left")}
              </span>
            )}
          </p>
          <p className="max-w-[320px] text-center font-sans text-xs leading-[1.7] text-muted-foreground">
            {t("Scan with ABA, ACLEDA, Wing or any bank app. This page updates by itself once you pay.")}
          </p>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 font-sans text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
        {t("Secure payment through Bakong, National Bank of Cambodia")}
      </p>
    </div>
  );
}

function PaidView({ state, summary }: { state: PaymentState; summary: OrderSummary }) {
  const { t, lang } = useStorePrefs();
  const done = state.status === "completed";
  const amount = state.amount ?? summary.amount;

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-[0_6px_18px_rgb(22_163_74/0.4)]">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
      </div>
      <h1 className="font-sans text-xl font-bold leading-relaxed">{t("Payment received")}</h1>
      <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
        {done ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            {state.codes?.length
              ? lang === "km"
                ? "លេខកូដរបស់អ្នករួចរាល់ហើយ"
                : "Your code is ready"
              : t("Delivered to your account")}
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Topping up your account now (1-5 minutes)")}
          </>
        )}
      </p>

      {state.codes?.length ? <RedeemCodes codes={state.codes} /> : null}

      <dl className="mx-auto mt-6 max-w-[340px] divide-y divide-border rounded-2xl border border-border text-left font-sans text-sm">
        <Row label={t("Order")} value={`#${summary.code}`} />
        <Row label={t("Game")} value={summary.game} />
        <Row label={t("Package")} value={summary.item} />
        {amount != null && <Row label={t("Total")} value={`$${amount.toFixed(2)}`} />}
      </dl>
    </div>
  );
}

// The Roblox gift code with a copy button and how to redeem it.
function RedeemCodes({ codes }: { codes: string[] }) {
  const { lang } = useStorePrefs();
  const km = lang === "km";
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (code: string) => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  const steps = km
    ? [
        "ចុច Copy ដើម្បីចម្លងលេខកូដ",
        "បើក roblox.com/redeem ក្នុង browser (មិនមែនកម្មវិធី Roblox) ហើយ log in គណនីរបស់អ្នក",
        "Paste លេខកូដក្នុងប្រអប់ Enter your code ហើយចុច Redeem",
        "Robux ចូលគណនីភ្លាមៗ · លេខកូដប្រើបានតែម្តង កុំឲ្យអ្នកណាឃើញ",
      ]
    : [
        "Tap Copy to copy the code.",
        "Open roblox.com/redeem in a browser (not the Roblox app) and sign in.",
        "Paste the code into Enter your code and tap Redeem.",
        "Robux arrive at once. The code works only once, so keep it private.",
      ];
  return (
    <div className="mx-auto mt-6 max-w-[340px] rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left font-sans">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
        <Gift className="h-4 w-4" /> {km ? "លេខកូដ Roblox របស់អ្នក" : "Your Roblox code"}
      </p>
      {codes.map((code) => (
        <div
          key={code}
          className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2"
        >
          <span className="select-all break-all font-mono text-base font-bold tracking-wider">
            {code}
          </span>
          <button
            type="button"
            onClick={() => copy(code)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {copied === code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === code ? (km ? "បានចម្លង" : "Copied") : "Copy"}
          </button>
        </div>
      ))}
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-muted-foreground">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <a
        href="https://www.roblox.com/redeem"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        roblox.com/redeem <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
