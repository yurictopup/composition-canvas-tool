import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { findGame, getPackages, mlbbHotItems, payments } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";

export const Route = createFileRoute("/game/$gameId")({
  head: ({ params }) => {
    const game = findGame(params.gameId);
    const name = game?.name ?? "Game";
    const unit = game?.unit ?? "Diamonds";
    return {
      meta: [
        { title: `${name} — Yuric Topup` },
        { name: "description", content: `Top up ${unit} ${name} — fast and secure via ABA KHQR.` },
        { property: "og:title", content: `${name} — Yuric Topup` },
        { property: "og:description", content: `Top up ${name} in 1-3 minutes via KHQR.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  return <GamePage key={gameId} gameId={gameId} />;
}

function GamePage({ gameId }: { gameId: string }) {
  const game = findGame(gameId);
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pkg, setPkg] = useState<number | null>(null);
  const [pay, setPay] = useState(payments[0] ?? "ABA KHQR");
  const [done, setDone] = useState(false);

  if (!game) throw notFound();

  const idConfig = getIdConfig(gameId);
  const availablePackages = getPackages(gameId);
  const selected = pkg !== null ? (availablePackages[pkg] ?? null) : null;
  const canBuy = !!check?.ok && !!selected && selected.price !== null;

  function runCheck() {
    const error = validatePlayerId(gameId, uid, zone);
    if (error) {
      setCheck({ ok: false, msg: error });
      return;
    }
    if (idConfig.requiresLookup) {
      setCheck({ ok: false, msg: "Account name lookup is not available yet — the Check ID service is not connected." });
      return;
    }
    setCheck({ ok: true, msg: `ID format ${uid.trim()} is valid — real account not yet verified.` });
  }

  return (
    <SiteChrome>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        <Link to="/" hash="games" className="text-sm text-on-dark-muted transition-colors hover:text-on-dark">← Back to games</Link>

        <div className="card-3d mt-3 flex items-center gap-4 rounded-3xl p-5">
          <span className="tile-clean block w-20 shrink-0 rounded-[26%] sm:w-24">
            <img src={game.icon} alt={game.name} width={151} height={151} className="block aspect-square w-full object-cover" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-black">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{idConfig.requiresLookup ? game.unit : `${game.blurb} · Delivered in 1-3 minutes`}</p>
          </div>
        </div>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">1</span>
            បញ្ចូល Player ID
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); runCheck(); }} className={`grid items-end gap-3 ${idConfig.secondary ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              {idConfig.primary.label}
              <input value={uid} onChange={(e) => { setUid(e.target.value); setCheck(null); setDone(false); }} placeholder={idConfig.primary.placeholder}
                inputMode={idConfig.primary.numeric ? "numeric" : "text"} autoComplete="off" spellCheck={false}
                className="min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary" />
            </label>
            {idConfig.secondary && <label className="grid min-w-0 gap-2 text-sm font-semibold">
              {idConfig.secondary.label}
              {idConfig.secondary.options ? (
                <select value={zone} onChange={(e) => { setZone(e.target.value); setCheck(null); setDone(false); }}
                  className="h-12 min-w-0 rounded-lg border bg-input px-4 font-normal outline-none focus:border-primary">
                  <option value="">{idConfig.secondary.placeholder}</option>
                  {idConfig.secondary.options.map((server) => <option key={server} value={server}>{server}</option>)}
                </select>
              ) : <input value={zone} onChange={(e) => { setZone(e.target.value); setCheck(null); setDone(false); }} placeholder={idConfig.secondary.placeholder}
                inputMode={idConfig.secondary.numeric ? "numeric" : "text"} autoComplete="off" spellCheck={false}
                className="min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary" />}
            </label>}
            <Button type="submit" className="h-12 px-6 font-bold">Check ID</Button>
          </form>
          {check && (
            <p role="status" className={`mt-3 text-sm font-semibold ${check.ok ? "text-primary" : "text-destructive"}`}>
              {check.ok ? "✅" : "⚠️"} {check.msg}
            </p>
          )}
          {gameId === "roblox" && <p className="mt-3 text-sm text-muted-foreground">Roblox uses Gift Cards or official store purchases — Robux cannot be topped up directly by User ID.</p>}
        </section>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">2</span>
            ជ្រើសរើសកញ្ចប់ពេជ្រ
          </h2>

          {gameId === "mlbb" && mlbbHotItems.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-500">
                🔥 Hot Items
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mlbbHotItems.map((item) => (
                  <div key={item.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-card-foreground">{item.label}</div>
                      <div className="text-sm font-bold text-rose-500">${item.price.toFixed(2)}</div>
                    </div>
                    <img src={item.img} alt={item.label} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {availablePackages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {availablePackages.map((p, i) => (
                <button key={p.amt} onClick={() => setPkg(i)}
                  className={`relative flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${pkg === i ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}>
                  {p.hot && <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">HOT</span>}
                  <div>
                    <div className="text-base font-bold text-card-foreground">{p.amt}</div>
                    <div className="text-xs text-muted-foreground">{game.unit}</div>
                    <div className="mt-1 text-sm font-bold text-primary">{p.price !== null ? `$${p.price.toFixed(2)}` : "—"}</div>
                  </div>
                  <span className="text-2xl">💎</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No packages or prices yet.</p>
          )}
        </section>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">3</span>
            ជ្រើសរើសវិធីបង់ប្រាក់
          </h2>
          <div className="flex flex-wrap gap-2">
            {payments.map((m) => (
              <button key={m} onClick={() => setPay(m)} data-active={pay === m}
                className="chip-3d px-5 py-2 text-sm font-semibold">{m}</button>
            ))}
          </div>
        </section>

        <aside className="card-3d mt-5 rounded-3xl p-5">
          <h3 className="font-khmer text-lg">សង្ខេបការបញ្ជាទិញ</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Game</dt><dd>{game.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">ID</dt><dd>{uid || "—"}{zone && ` (${zone})`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Package</dt><dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{pay}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-3xl font-black text-accent">{selected?.price != null ? `$${selected.price.toFixed(2)}` : "—"}</span>
          </div>
          <button disabled={!canBuy} onClick={() => setDone(true)}
            className="btn-3d glow-pulse mt-5 w-full rounded-xl py-4 font-display font-bold disabled:opacity-40">
            Buy Now
          </button>
          {done && <p className="mt-3 text-center text-sm text-primary">✅ Order received! (test)</p>}
        </aside>
      </main>
    </SiteChrome>
  );
}
