import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminT } from "./i18n";

type Step =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

/**
 * The owner's second step: a 6-digit code from an authenticator app (Supabase
 * MFA TOTP). The first visit shows a QR code to add the shop to the app; later
 * visits only ask for the code. Owner data and actions need this level ("aal2")
 * on the server and in the database, not only on this screen.
 */
export function AdminMfa({ onPassed, dark }: { onPassed: () => void; dark: boolean }) {
  const { t } = useAdminT();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (level?.currentLevel === "aal2") return onPassed();
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const ready = factors.totp.find((f) => f.status === "verified");
      if (ready) {
        if (!cancelled) setStep({ kind: "verify", factorId: ready.id });
        return;
      }
      // A setup that was started but never confirmed blocks a new one with the same name.
      for (const f of factors.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Yuric Topup admin",
        issuer: "Yuric Topup",
      });
      if (enrollError) throw enrollError;
      if (!cancelled)
        setStep({
          kind: "enroll",
          factorId: data.id,
          qr: data.totp.qr_code,
          secret: data.totp.secret,
        });
    })().catch((e: unknown) => {
      if (!cancelled)
        setStep({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      cancelled = true;
    };
  }, [onPassed]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step.kind !== "enroll" && step.kind !== "verify") return;
    setBusy(true);
    setWrong(false);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: step.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setWrong(true);
      setCode("");
      return;
    }
    onPassed();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div
      className={`vx ${dark ? "vx-dark" : ""} flex min-h-screen items-center justify-center p-4`}
    >
      <div className="vx-card w-full max-w-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[var(--vx-primary)]" />
          <h1 className="text-lg font-semibold">{t("Owner sign-in check")}</h1>
        </div>

        {step.kind === "loading" && (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Checking...")}
          </p>
        )}

        {step.kind === "error" && (
          <p className="text-sm text-[var(--vx-danger)]">
            {t("Could not start the code check.")} {step.message}
          </p>
        )}

        {step.kind === "enroll" && (
          <div className="mb-4 space-y-3 text-sm leading-relaxed">
            <p className="flex gap-2">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              {t("Open Google Authenticator, tap +, then scan this QR code.")}
            </p>
            <img
              src={step.qr}
              alt="QR"
              width={180}
              height={180}
              className="mx-auto rounded bg-white p-2"
            />
            <p className="text-xs text-[var(--vx-muted)]">
              {t("Can't scan? Enter this key in the app:")}{" "}
              <code className="break-all font-mono text-[var(--vx-heading)]">{step.secret}</code>
            </p>
          </div>
        )}

        {(step.kind === "enroll" || step.kind === "verify") && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4" />
                {t("Enter the 6-digit code from the app")}
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded border border-[var(--vx-border)] bg-transparent px-3 py-2 text-center font-mono text-xl tracking-[0.4em] text-[var(--vx-heading)]"
              />
            </label>
            {wrong && (
              <p className="text-sm text-[var(--vx-danger)]">
                {t("Wrong or expired code. Try the new code.")}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="vx-btn flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Confirm")}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mt-4 flex items-center gap-1.5 text-xs text-[var(--vx-muted)] hover:underline"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("Sign out")}
        </button>
      </div>
    </div>
  );
}
