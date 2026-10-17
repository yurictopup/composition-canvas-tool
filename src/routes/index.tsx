import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero-gems.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GemZone — Game Top Up 3D" },
      { name: "description", content: "បញ្ចូលពេជ្រ Mobile Legends, Free Fire, PUBG UC បានលឿន សុវត្ថិភាព តាម ABA KHQR។" },
      { property: "og:title", content: "GemZone — Game Top Up 3D" },
      { property: "og:description", content: "Top up game diamonds instantly with ABA KHQR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const games = [
  { id: "mlbb", name: "Mobile Legends", emoji: "⚔️", unit: "Diamonds" },
  { id: "ff", name: "Free Fire", emoji: "🔥", unit: "Diamonds" },
  { id: "pubg", name: "PUBG Mobile", emoji: "🎯", unit: "UC" },
  { id: "hok", name: "Honor of Kings", emoji: "👑", unit: "Tokens" },
];

const packages = [
  { amt: 86, price: 1.5 }, { amt: 172, price: 3 }, { amt: 257, price: 4.5 },
  { amt: 344, price: 6 }, { amt: 514, price: 9 }, { amt: 706, price: 12, hot: true },
  { amt: 1412, price: 24 }, { amt: 2195, price: 36 }, { amt: 3688, price: 60 },
];

const payments = ["ABA KHQR", "Wing", "ACLEDA", "Bakong"];

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">{n}</span>
      {title}
    </h2>
  );
}

function Index() {
  const [game, setGame] = useState(games[0]!);
  const [pkg, setPkg] = useState<number | null>(5);
  const [pay, setPay] = useState(payments[0]!);
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const [done, setDone] = useState(false);
  const selected = pkg !== null ? packages[pkg] : null;
  const canBuy = uid.trim() && selected;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-display text-xl font-black text-glow">💎 GEM<span className="text-accent">ZONE</span></span>
          <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#topup">Top Up</a><a href="#topup">Games</a><a href="#help">ជំនួយ</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full border px-3 py-1 text-xs text-primary">⚡ ចូលភ្លាមៗ ក្នុង 1-3 នាទី</p>
          <h1 className="font-display text-4xl font-black leading-tight md:text-6xl">
            GAME <span className="text-primary text-glow">TOP UP</span> <span className="text-accent">3D</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">បញ្ចូលពេជ្រហ្គេម លឿន ថោក សុវត្ថិភាព — បង់ប្រាក់តាម KHQR។</p>
          <a href="#topup" className="btn-3d mt-8 inline-block rounded-xl px-8 py-4 font-display font-bold">TOP UP NOW</a>
        </div>
        <img src={hero} alt="Glowing 3D diamonds and gold coins" width={1280} height={896} className="animate-float rounded-3xl card-3d" />
      </section>

      <main id="topup" className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card-3d rounded-2xl p-5">
            <Step n={1} title="ជ្រើសរើសហ្គេម" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {games.map((g) => (
                <button key={g.id} onClick={() => setGame(g)}
                  className={`card-3d rounded-xl p-4 text-center hover:-translate-y-1 ${game.id === g.id ? "card-3d-active" : ""}`}>
                  <div className="text-4xl">{g.emoji}</div>
                  <div className="mt-2 text-sm font-semibold">{g.name}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card-3d rounded-2xl p-5">
            <Step n={2} title="បញ្ចូល Player ID" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User ID"
                className="rounded-xl border bg-input px-4 py-3 outline-none focus:border-primary" />
              <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone ID"
                className="rounded-xl border bg-input px-4 py-3 outline-none focus:border-primary" />
            </div>
          </section>

          <section className="card-3d rounded-2xl p-5">
            <Step n={3} title={`ជ្រើសកញ្ចប់ ${game.unit}`} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {packages.map((p, i) => (
                <button key={p.amt} onClick={() => setPkg(i)}
                  className={`card-3d relative rounded-xl p-4 text-left hover:-translate-y-1 ${pkg === i ? "card-3d-active" : ""}`}>
                  {p.hot && <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">HOT</span>}
                  <div className="font-display font-bold">💎 {p.amt}</div>
                  <div className="text-xs text-muted-foreground">{game.unit}</div>
                  <div className="mt-2 font-bold text-accent">${p.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card-3d rounded-2xl p-5">
            <Step n={4} title="វិធីបង់ប្រាក់" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {payments.map((m) => (
                <button key={m} onClick={() => setPay(m)}
                  className={`card-3d rounded-xl p-4 text-sm font-semibold ${pay === m ? "card-3d-active" : ""}`}>{m}</button>
              ))}
            </div>
          </section>
        </div>

        <aside className="card-3d h-fit rounded-2xl p-5 lg:sticky lg:top-20">
          <h3 className="font-display text-lg font-bold">សង្ខេបការបញ្ជាទិញ</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Game</dt><dd>{game.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">ID</dt><dd>{uid || "—"}{zone && ` (${zone})`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Package</dt><dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{pay}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">សរុប</span>
            <span className="font-display text-3xl font-black text-accent">${selected?.price.toFixed(2) ?? "0.00"}</span>
          </div>
          <button disabled={!canBuy} onClick={() => setDone(true)}
            className="btn-3d mt-5 w-full rounded-xl py-4 font-display font-bold disabled:opacity-40">
            ទិញឥឡូវ
          </button>
          {done && <p className="mt-3 text-center text-sm text-primary">✅ ការបញ្ជាទិញបានទទួល! (សាកល្បង)</p>}
        </aside>
      </main>

      <footer id="help" className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 GemZone · Telegram: @gemzone_support
      </footer>
    </div>
  );
}
