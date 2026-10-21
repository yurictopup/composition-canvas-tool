import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMsg({ ok: false, text: "Please enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      setMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setMsg({ ok: false, text: "Incorrect email or password." });
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
          setMsg({ ok: true, text: "Sign-up complete! Check your email to confirm your account." });
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
          <h1 className="text-center font-display text-2xl font-black">
            {mode === "login" ? "Sign In" : "Sign Up"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Sign in with your email" : "Create a new account with your email"}
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setMsg(null); }}
                placeholder="you@example.com"
                autoComplete="email"
                className="rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setMsg(null); }}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary"
              />
            </label>
            <Button type="submit" disabled={busy} className="h-12 font-display font-bold">
              {busy ? "Processing…" : mode === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          {msg && (
            <p role="status" className={`mt-4 text-center text-sm font-semibold ${msg.ok ? "text-primary" : "text-destructive"}`}>
              {msg.ok ? "✅" : "⚠️"} {msg.text}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
          <p className="mt-3 text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← Back to home</Link>
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
