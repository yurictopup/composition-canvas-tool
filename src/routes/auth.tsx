import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Gem, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yuric Topup" },
      { name: "description", content: "Sign in or create a Yuric Topup account with your email to top up game diamonds." },
      { property: "og:title", content: "Sign in — Yuric Topup" },
      { property: "og:description", content: "Sign in or create a Yuric Topup account with your email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-400" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-400" };
  return { score, label: "Strong", color: "bg-green-500" };
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pwStr = mode === "signup" ? passwordStrength(password) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMsg({ ok: false, text: "សូមបញ្ចូល email ត្រឹមត្រូវ" });
      return;
    }
    if (password.length < 8) {
      setMsg({ ok: false, text: "Password ត្រូវការយ៉ាងតិច 8 តួអក្សរ" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (error.message.includes("rate") || error.message.includes("limit")) {
            setMsg({ ok: false, text: "ព្យាយាមច្រើនពេក សូមរង់ចាំ 1 នាទីទៀត" });
          } else {
            setMsg({ ok: false, text: "Email ឬ Password មិនត្រឹមត្រូវ" });
          }
          return;
        }
        navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          setMsg({ ok: false, text: error.message });
          return;
        }
        if (!data.session) {
          setMsg({ ok: true, text: "បង្កើតគណនីបានរួច! សូមពិនិត្យ email ដើម្បី confirm គណនី" });
          return;
        }
        navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteChrome>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 items-center px-4 py-10 sm:px-6">
        <section className="card-3d w-full rounded-3xl p-6 sm:p-8">
          <div className="mb-6 text-center">
            <Gem className="mx-auto mb-2 h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="font-display text-2xl font-black">
              {mode === "login" ? "Sign In" : "Sign Up"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "ចូលគណនី Yuric Topup" : "បង្កើតគណនីថ្មី"}
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setMsg(null); }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Password
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setMsg(null); }}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  className="w-full rounded-lg border bg-input px-4 py-3 pr-12 font-normal outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            {/* Password strength bar — signup only */}
            {pwStr && password.length > 0 && (
              <div className="grid gap-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwStr.score ? pwStr.color : "bg-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password: <span className="font-semibold">{pwStr.label}</span>
                  {pwStr.score < 3 && " — ដាក់ Capital letter, number, ឬ symbol ដើម្បី strong ជាង"}
                </p>
              </div>
            )}

            <Button type="submit" disabled={busy} className="h-12 font-display font-bold">
              {busy ? "Processing…" : mode === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          {msg && (
            <p role="status" className={`mt-4 text-center text-sm font-semibold ${msg.ok ? "text-primary" : "text-destructive"}`}>
              {msg.ok ? (
                <CheckCircle2 className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
              )}
              {msg.text}
            </p>
          )}

          {/* Security note */}
          <div className="mt-5 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground text-center">
            <Lock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            ព័ត៌មានរបស់អ្នកមានសុវត្តិភាព — encrypted ដោយ Supabase
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "គ្មានគណនី?" : "មានគណនីហើយ?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); setPassword(""); }}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
          <p className="mt-3 text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← ត្រឡប់ទៅ Home</Link>
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
