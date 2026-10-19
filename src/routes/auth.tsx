import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ចូលគណនី — Yuric Topup" },
      { name: "description", content: "ចូល ឬចុះឈ្មោះគណនី Yuric Topup តាម Email ដើម្បីបញ្ចូលពេជ្រហ្គេម។" },
      { property: "og:title", content: "ចូលគណនី — Yuric Topup" },
      { property: "og:description", content: "ចូល ឬចុះឈ្មោះគណនី Yuric Topup តាម Email។" },
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
      setMsg({ ok: false, text: "សូមបញ្ចូល Email ឱ្យត្រឹមត្រូវ។" });
      return;
    }
    if (password.length < 6) {
      setMsg({ ok: false, text: "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួអក្សរ។" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setMsg({ ok: false, text: "Email ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។" });
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
          setMsg({ ok: true, text: "ចុះឈ្មោះរួចរាល់! សូមពិនិត្យ Email របស់អ្នក ដើម្បីបញ្ជាក់គណនី។" });
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
            {mode === "login" ? "ចូលគណនី" : "ចុះឈ្មោះ"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "login" ? "ចូលដោយ Email របស់អ្នក" : "បង្កើតគណនីថ្មីដោយ Email"}
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
              ពាក្យសម្ងាត់
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
              {busy ? "កំពុងដំណើរការ…" : mode === "login" ? "ចូលគណនី" : "ចុះឈ្មោះ"}
            </Button>
          </form>

          {msg && (
            <p role="status" className={`mt-4 text-center text-sm font-semibold ${msg.ok ? "text-primary" : "text-destructive"}`}>
              {msg.ok ? "✅" : "⚠️"} {msg.text}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "មិនទាន់មានគណនី?" : "មានគណនីរួចហើយ?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {mode === "login" ? "ចុះឈ្មោះ" : "ចូលគណនី"}
            </button>
          </p>
          <p className="mt-3 text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← ត្រឡប់ទៅទំព័រដើម</Link>
          </p>
        </section>
      </main>
    </SiteChrome>
  );
}
