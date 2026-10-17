import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import mlbb from "@/assets/mlbb.png.asset.json";
import freefire from "@/assets/freefire.png.asset.json";
import roblox from "@/assets/roblox.png.asset.json";
import magicchess from "@/assets/magicchess.png.asset.json";
import pubg from "@/assets/pubg.png.asset.json";
import hok from "@/assets/hok.png.asset.json";

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
  { id: "mlbb", name: "Mobile Legends", icon: mlbb.url, unit: "Diamonds" },
  { id: "ff", name: "Free Fire", icon: freefire.url, unit: "Diamonds" },
  { id: "roblox", name: "Roblox", icon: roblox.url, unit: "Robux" },
  { id: "magicchess", name: "Magic Chess GoGo", icon: magicchess.url, unit: "Diamonds" },
  { id: "pubg", name: "PUBG Mobile", icon: pubg.url, unit: "UC" },
  { id: "hok", name: "Honor of Kings", icon: hok.url, unit: "Tokens" },
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
    <div className="page-gradient min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-brand-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-display text-xl font-black text-glow">💎 GEM<span className="text-brand-400">ZONE</span></span>
          <nav className="hidden gap-6 text-sm text-on-dark-muted sm:flex">
            <a href="#topup">Top Up</a><a href="#topup">Games</a><a href="#help">ជំនួយ</a>
          </nav>
        </div>
      </header>

      <div className="overflow-hidden border-y border-brand-400/25 bg-primary py-2 text-sm font-semibold text-primary-foreground">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="flex shrink-0 items-center gap-10 pr-10">
              <span>⚡ បញ្ចូលពេជ្រក្នុង 1-3 នាទី</span>
              <span>💎 តម្លៃថោកបំផុត</span>
              <span>🔒 បង់ប្រាក់សុវត្ថិភាព</span>
              <span>🎧 ជំនួយ 24 ម៉ោង</span>
            </span>
          ))}
        </div>
      </div>

      <section className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden px-4 py-12 md:grid-cols-2">
        <span className="sparkle" style={{ top: "14%", left: "4%", animationDelay: "0.3s" }} />
        <span className="sparkle" style={{ top: "58%", left: "40%", animationDelay: "1.4s" }} />
        <span className="sparkle" style={{ top: "80%", left: "22%", animationDelay: "2.2s" }} />
        <div>
          <p className="mb-3 inline-block rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1 text-xs text-brand-400">⚡ ចូលភ្លាមៗ ក្នុង 1-3 នាទី</p>
          <h1 className="font-display text-4xl font-black leading-tight md:text-6xl">
            GAME <span className="text-brand-400 text-glow">TOP UP</span> <span className="text-on-dark text-glow">3D</span>
          </h1>
          <p className="mt-4 text-lg text-on-dark-muted">បញ្ចូលពេជ្រហ្គេម លឿន ថោក សុវត្ថិភាព — បង់ប្រាក់តាម KHQR។</p>
          <a href="#topup" className="btn-3d glow-pulse mt-8 inline-block rounded-xl px-8 py-4 font-display font-bold">TOP UP NOW</a>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 gap-4 [perspective:900px]">
            {games.map((g, i) => (
              <button key={g.id} onClick={() => setGame(g)}
                className={`tile-3d p-3 text-center ${game.id === g.id ? "tile-active" : ""}`}
                style={{ "--shine-delay": `${i * 0.45}s` } as CSSProperties}>
                <span className="sparkle" style={{ top: "10%", left: "12%", animationDelay: `${i * 0.4}s` }} />
                <span className="sparkle" style={{ top: "56%", left: "74%", animationDelay: `${i * 0.4 + 1.1}s` }} />
                <img src={g.icon} alt={g.name} width={151} height={151} className="w-full rounded-[26%] object-cover" />
                <span className="mt-2 block truncate text-[11px] font-semibold">{g.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {games.map((g) => (
              <button key={g.id} onClick={() => setGame(g)} aria-label={g.name}
                className={`h-2 rounded-full transition-all ${game.id === g.id ? "w-7 bg-primary" : "w-2 bg-brand-400/60 hover:bg-brand-400"}`} />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-4">
        <span className="chip-3d px-4 py-2 text-xs font-bold">🔥 HOT</span>
        {games.map((g) => (
          <button key={g.id} onClick={() => setGame(g)} data-active={game.id === g.id}
            className="chip-3d px-4 py-2 text-xs font-bold uppercase">{g.name}</button>
        ))}
      </div>

      <main id="topup" className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card-3d rounded-2xl p-5">
            <Step n={1} title="ជ្រើសរើសហ្គេម" />
            <div className="grid grid-cols-2 gap-3 [perspective:900px] sm:grid-cols-3">
              {games.map((g, i) => (
                <button key={g.id} onClick={() => setGame(g)}
                  className={`tile-3d p-3 text-center ${game.id === g.id ? "tile-active" : ""}`}
                  style={{ "--shine-delay": `${i * 0.45}s` } as CSSProperties}>
                  <img src={g.icon} alt={g.name} width={151} height={151} className="w-full rounded-[26%] object-cover" />
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
            className="btn-3d glow-pulse mt-5 w-full rounded-xl py-4 font-display font-bold disabled:opacity-40">
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
