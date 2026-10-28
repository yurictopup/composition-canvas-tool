import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gem,
  Headphones,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  ReceiptText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteChrome } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { games } from "@/lib/games";
import { useSiteImage } from "@/lib/site-images";
import { useStorePrefs } from "@/lib/storePrefs";
import banner from "@/assets/banner-angkor.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yuric Topup" },
      {
        name: "description",
        content: "Sign in or create a Yuric Topup account with your email to top up game diamonds.",
      },
      { property: "og:title", content: "Sign in — Yuric Topup" },
      {
        property: "og:description",
        content: "Sign in or create a Yuric Topup account with your email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function passwordStrength(pw: string): { score: number; label: string; km: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", km: "ខ្សោយ", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", km: "មធ្យម", color: "bg-orange-400" };
  if (score <= 3) return { score, label: "Good", km: "ល្អ", color: "bg-yellow-400" };
  return { score, label: "Strong", km: "ខ្លាំង", color: "bg-green-500" };
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // After sign up, the email carries a 6-digit code (and a link); either one confirms the account.
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const { lang, light } = useStorePrefs();
  const pic = useSiteImage();
  const tx = (km: string, en: string) => (lang === "km" ? km : en);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

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
          setCodeFor(email.trim());
          setCode("");
          setCooldown(60);
          setMsg({ ok: true, text: "យើងបានផ្ញើកូដ 6 ខ្ទង់ទៅ email របស់អ្នក" });
          return;
        }
        navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeFor) return;
    setMsg(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setMsg({ ok: false, text: "កូដត្រូវមាន 6 ខ្ទង់" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: codeFor,
        token: code.trim(),
        type: "signup",
      });
      if (error) {
        setMsg({ ok: false, text: "កូដខុស ឬផុតកំណត់ សូមសាកម្តងទៀត" });
        return;
      }
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!codeFor) return;
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: codeFor,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (!error) setCooldown(60);
    setMsg(
      error
        ? { ok: false, text: "ផ្ញើម្តងទៀតមិនបាន សូមរង់ចាំ 1 នាទី" }
        : { ok: true, text: "បានផ្ញើកូដថ្មីទៅ email របស់អ្នក" },
    );
  }

  const busyLabel = tx("កំពុងដំណើរការ", "Processing");
  const field = `h-12 w-full rounded-xl border pl-11 pr-4 text-[15px] outline-none transition focus:ring-4 ${
    light
      ? "border-[#d6e2f5] bg-[#f6f9ff] text-[#142650] placeholder:text-[#9aa8c4] focus:border-brand-500 focus:ring-brand-500/15"
      : "border-white/12 bg-white/[0.06] text-on-dark placeholder:text-on-dark-muted/60 focus:border-brand-400 focus:ring-brand-400/20"
  }`;
  const fieldIcon = `pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${
    light ? "text-[#7b8db3]" : "text-on-dark-muted"
  }`;
  const muted = light ? "text-[#5b6785]" : "text-on-dark-muted";
  const popular = ["mlbb", "ff", "pubg", "hok", "roblox"]
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is (typeof games)[number] => !!g);

  const perks = [
    { Icon: Zap, km: "ពេជ្រចូលក្នុង 1 ទៅ 5 នាទី", en: "Delivered in 1-5 minutes" },
    { Icon: ShieldCheck, km: "បង់ប្រាក់តាម KHQR មានសុវត្ថិភាព", en: "Safe KHQR payment" },
    { Icon: ReceiptText, km: "តាមដាន order បានគ្រប់ពេល", en: "Track every order" },
    { Icon: Headphones, km: "ជំនួយតាម Telegram 24 ម៉ោង", en: "24 hour Telegram support" },
  ];

  return (
    <SiteChrome>
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 items-center px-3 py-6 sm:px-6 sm:py-12">
        <div
          className={`grid w-full overflow-hidden rounded-[28px] border lg:grid-cols-[1.05fr_1fr] ${
            light
              ? "border-[#dbe6f7] bg-white shadow-[0_30px_80px_-20px_rgb(20_38_80/0.28)]"
              : "border-white/10 bg-[oklch(0.22_0.08_264/0.92)] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
          }`}
        >
          {/* Brand side: the home banner under a deep navy wash, with what the customer gets */}
          <aside className="relative isolate flex flex-col justify-between overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-10 lg:min-h-[640px]">
            <img
              src={pic(banner)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(7_20_60/0.82)_0%,rgb(18_44_120/0.78)_45%,rgb(7_20_60/0.94)_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl"
            />

            <div>
              <div className="hidden items-center gap-2 font-display text-lg font-black tracking-wide sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/25 backdrop-blur">
                  <Gem className="h-[18px] w-[18px] text-brand-400" aria-hidden="true" />
                </span>
                YURIC<span className="text-brand-400">TOPUP</span>
              </div>
              <h2 className="font-khmer text-[22px] font-normal leading-[1.6] sm:mt-10 sm:text-[34px]">
                {tx("បញ្ចូលពេជ្រហ្គេម", "Game top-ups,")}
                <br />
                <span className="bg-[linear-gradient(90deg,#9cc8ff,#ffffff)] bg-clip-text text-transparent">
                  {tx("លឿន និងទុកចិត្តបាន", "fast and trusted")}
                </span>
              </h2>
              <p className="mt-2 hidden max-w-sm text-sm leading-[1.8] text-white/75 sm:block">
                {tx(
                  "បង្កើតគណនីមួយ ដើម្បីទិញបានលឿនជាងមុន និងមើលប្រវត្តិ order ទាំងអស់",
                  "One account to check out faster and see all your orders",
                )}
              </p>
            </div>

            <ul className="mt-6 hidden gap-2.5 sm:grid">
              {perks.map(({ Icon, km, en }) => (
                <li
                  key={en}
                  className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 text-sm backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#5b8cff,#2f5fe0)] shadow-[0_6px_16px_rgb(47_95_224/0.45)]">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="leading-[1.7]">{tx(km, en)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-3 sm:mt-8">
              <div className="flex -space-x-2.5">
                {popular.map((g) => (
                  <img
                    key={g.id}
                    src={pic(g.icon)}
                    alt={g.name}
                    className="h-9 w-9 rounded-xl object-cover ring-2 ring-[#0b1d52]"
                  />
                ))}
              </div>
              <p className="text-xs leading-[1.7] text-white/75">
                {tx(`${games.length} ហ្គេម ក្នុងគណនីតែមួយ`, `${games.length} games, one account`)}
              </p>
            </div>
          </aside>

          {/* Form side */}
          <section
            className={`px-5 py-7 sm:px-12 sm:py-12 ${light ? "text-[#142650]" : "text-on-dark"}`}
          >
            {codeFor ? (
              <form onSubmit={verifyCode} className="mx-auto grid max-w-[400px] gap-5">
                <span
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                    light ? "bg-[#eef3ff] text-brand-500" : "bg-white/[0.08] text-brand-400"
                  }`}
                >
                  <MailCheck className="h-8 w-8" aria-hidden="true" />
                </span>
                <div className="text-center">
                  <h1 className="text-2xl font-bold leading-[1.6]">
                    {tx("ពិនិត្យ email របស់អ្នក", "Check your email")}
                  </h1>
                  <p className={`mt-1 text-sm leading-[1.8] ${muted}`}>
                    {tx("យើងបានផ្ញើកូដ 6 ខ្ទង់ទៅ", "We sent a 6-digit code to")}{" "}
                    <span className="font-semibold text-current">{codeFor}</span>
                  </p>
                </div>
                <CodeBoxes
                  value={code}
                  light={light}
                  onChange={(v) => {
                    setCode(v);
                    setMsg(null);
                  }}
                />
                <Button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="btn-3d h-12 rounded-xl text-[15px] font-semibold"
                >
                  {busy ? busyLabel : tx("បញ្ជាក់គណនី", "Confirm account")}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeFor(null);
                      setMsg(null);
                    }}
                    className={`inline-flex items-center gap-1 ${muted} hover:text-current`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {tx("ប្តូរ email", "Change email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resendCode()}
                    disabled={busy || cooldown > 0}
                    className="font-semibold text-brand-500 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {cooldown > 0
                      ? tx(`ផ្ញើម្តងទៀតក្នុង ${cooldown}s`, `Resend in ${cooldown}s`)
                      : tx("ផ្ញើកូដម្តងទៀត", "Resend code")}
                  </button>
                </div>
                <p className={`text-center text-xs leading-[1.8] ${muted}`}>
                  {tx(
                    "រកមិនឃើញ? សូមមើលក្នុង Spam ឬ Promotions",
                    "Can't find it? Check Spam or Promotions",
                  )}
                </p>
              </form>
            ) : (
              <div className="mx-auto max-w-[400px]">
                <div
                  role="tablist"
                  className={`relative grid grid-cols-2 rounded-2xl p-1 ${light ? "bg-[#eef3fb]" : "bg-white/[0.06]"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ${
                      light ? "bg-white shadow-[0_4px_14px_rgb(20_38_80/0.12)]" : "bg-white/[0.12]"
                    } ${mode === "signup" ? "translate-x-full" : ""}`}
                  />
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => {
                        setMode(m);
                        setMsg(null);
                        setPassword("");
                      }}
                      className={`relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
                        mode === m ? "text-current" : muted
                      }`}
                    >
                      {m === "login" ? tx("ចូលគណនី", "Sign in") : tx("ចុះឈ្មោះ", "Sign up")}
                    </button>
                  ))}
                </div>

                <div className="mt-7">
                  <h1 className="text-[22px] font-bold leading-[1.5] sm:text-[26px]">
                    {mode === "login"
                      ? tx("សូមស្វាគមន៍ការត្រឡប់មកវិញ", "Welcome back")
                      : tx("បង្កើតគណនីថ្មី", "Create your account")}
                  </h1>
                  <p className={`mt-1 text-sm leading-[1.8] ${muted}`}>
                    {mode === "login"
                      ? tx(
                          "ចូលដើម្បីទិញ និងមើល order របស់អ្នក",
                          "Sign in to buy and see your orders",
                        )
                      : tx(
                          "ចុះឈ្មោះដោយឥតគិតថ្លៃ ចំណាយពេលតែ 1 នាទី",
                          "Free, and takes about a minute",
                        )}
                  </p>
                </div>

                <form onSubmit={submit} className="mt-6 grid gap-4">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Email
                    <span className="relative">
                      <Mail className={fieldIcon} aria-hidden="true" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setMsg(null);
                        }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className={field}
                      />
                    </span>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    {tx("ពាក្យសម្ងាត់", "Password")}
                    <span className="relative">
                      <KeyRound className={fieldIcon} aria-hidden="true" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setMsg(null);
                        }}
                        placeholder={tx("យ៉ាងតិច 8 តួអក្សរ", "At least 8 characters")}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={8}
                        className={`${field} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg ${muted} hover:text-current`}
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </span>
                  </label>

                  {pwStr && password.length > 0 && (
                    <div className="grid gap-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i <= pwStr.score
                                ? pwStr.color
                                : light
                                  ? "bg-[#e3eaf5]"
                                  : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs leading-[1.7] ${muted}`}>
                        {tx("កម្លាំង", "Strength")}:{" "}
                        <span className="font-semibold text-current">
                          {tx(pwStr.km, pwStr.label)}
                        </span>
                        {pwStr.score < 3 &&
                          tx(
                            " · ដាក់អក្សរធំ លេខ ឬនិមិត្តសញ្ញា",
                            " · add a capital, number or symbol",
                          )}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={busy}
                    className="btn-3d mt-1 h-12 rounded-xl text-[15px] font-semibold"
                  >
                    {busy
                      ? busyLabel
                      : mode === "login"
                        ? tx("ចូលគណនី", "Sign in")
                        : tx("បង្កើតគណនី", "Create account")}
                    {!busy && <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />}
                  </Button>
                </form>
              </div>
            )}

            {msg && (
              <p
                role="status"
                className={`mx-auto mt-4 flex max-w-[400px] items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm leading-[1.7] ${
                  msg.ok
                    ? light
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : light
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-red-400/30 bg-red-400/10 text-red-300"
                }`}
              >
                {msg.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {msg.text}
              </p>
            )}

            <div
              className={`mx-auto mt-7 flex max-w-[400px] items-center gap-3 border-t pt-5 text-xs leading-[1.7] ${light ? "border-[#e6edf8]" : "border-white/10"} ${muted}`}
            >
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tx(
                "ពាក្យសម្ងាត់ត្រូវបានរក្សាទុកដោយសុវត្ថិភាព យើងមិនដែលសុំពាក្យសម្ងាត់គណនីហ្គេមទេ",
                "Your password is stored securely. We never ask for your game password",
              )}
            </div>
            <p className="mt-4 text-center text-sm">
              <Link to="/" className={`inline-flex items-center gap-1 ${muted} hover:text-current`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {tx("ត្រឡប់ទៅទំព័រដើម", "Back to home")}
              </Link>
            </p>
          </section>
        </div>
      </main>
    </SiteChrome>
  );
}

/** Six boxes for the email code; typing, backspace and pasting all move between boxes. */
function CodeBoxes({
  value,
  light,
  onChange,
}: {
  value: string;
  light: boolean;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const put = (start: number, text: string) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = (value.slice(0, start) + clean).slice(0, 6);
    onChange(next);
    refs.current[Math.min(next.length, 5)]?.focus();
  };
  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5" aria-label="Code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          maxLength={6}
          onChange={(e) => put(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            put(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              const cut = d ? i : i - 1;
              if (cut < 0) return;
              onChange(value.slice(0, cut));
              refs.current[cut]?.focus();
            }
          }}
          className={`h-14 w-full rounded-xl border text-center font-display text-2xl font-bold outline-none transition focus:ring-4 ${
            light
              ? "border-[#d6e2f5] bg-[#f6f9ff] text-[#142650] focus:border-brand-500 focus:ring-brand-500/15"
              : "border-white/12 bg-white/[0.06] text-on-dark focus:border-brand-400 focus:ring-brand-400/20"
          }`}
        />
      ))}
    </div>
  );
}
