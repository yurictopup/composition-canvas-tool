import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { findGame, packages, payments } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";

export const Route = createFileRoute("/game/$gameId")({
  head: ({ params }) => {
    const game = findGame(params.gameId);
    const name = game?.name ?? "ហ្គេម";
    const unit = game?.unit ?? "ពេជ្រ";
    return {
      meta: [
        { title: `${name} — Yuric Topup` },
        { name: "description", content: `បញ្ចូល ${unit} ${name} លឿន សុវត្ថិភាព តាម ABA KHQR។` },
        { property: "og:title", content: `${name} — Yuric Topup` },
        { property: "og:description", content: `បញ្ចូល ${name} ក្នុង 1-3 នាទី តាម KHQR។` },
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
  const availablePackages = idConfig.requiresLookup ? [] : packages;
  const selected = pkg !== null ? packages[pkg] : null;
  const canBuy = !!check?.ok && !!selected;

  function runCheck() {
    const error = validatePlayerId(gameId, uid, zone);
    if (error) {
      setCheck({ ok: false, msg: error });
      return;
    }
    if (idConfig.requiresLookup) {
      setCheck({ ok: false, msg: "មិនទាន់អាចស្វែងរកឈ្មោះគណនីបានទេ — សេវា Check ID មិនទាន់ភ្ជាប់។" });
      return;
    }
    setCheck({ ok: true, msg: `ទម្រង់ ID ${uid.trim()} ត្រឹមត្រូវ — មិនទាន់បានផ្ទៀងផ្ទាត់គណនីពិតទេ។` });
  }

  return (
    <SiteChrome>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        <Link to="/" hash="games" className="text-sm text-on-dark-muted transition-colors hover:text-on-dark">← ត្រឡប់ទៅហ្គេម</Link>

        <div className="card-3d mt-3 flex items-center gap-4 rounded-3xl p-5">
          <span className="tile-clean block w-20 shrink-0 rounded-[26%] sm:w-24">
            <img src={game.icon} alt={game.name} width={151} height={151} className="block aspect-square w-full object-cover" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-black">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{game.blurb} · ចូលក្នុង 1-3 នាទី</p>
          </div>
        </div>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
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
              <input value={zone} onChange={(e) => { setZone(e.target.value); setCheck(null); setDone(false); }} placeholder={idConfig.secondary.placeholder}
                inputMode={idConfig.secondary.numeric ? "numeric" : "text"} autoComplete="off" spellCheck={false}
                className="min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary" />
            </label>}
            <Button type="submit" className="h-12 px-6 font-bold">Check ID</Button>
          </form>
          {check && (
            <p role="status" className={`mt-3 text-sm font-semibold ${check.ok ? "text-primary" : "text-destructive"}`}>
              {check.ok ? "✅" : "⚠️"} {check.msg}
            </p>
          )}
          {!idConfig.requiresLookup && <p className="mt-3 text-xs text-muted-foreground">
            ការត្រួតពិនិត្យនី ពិនិត្យតែទម្រង់លេខប៉ុណ្ណោះ — ការសួរពីប្រព័ន្ធហ្គេមពិតប្រាកដ នឹងដាក់នៅពេលភ្ជាប់ជាមួយអ្នកផ្គត់ផ្គង់។
          </p>}
        </section>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">2</span>
            ជ្រើសកញ្ចប់ {game.unit}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {availablePackages.map((p, i) => (
              <button key={p.amt} onClick={() => setPkg(i)}
                className={`card-3d relative rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 ${pkg === i ? "card-3d-active" : ""}`}>
                {p.hot && <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 text-[11px] font-bold text-accent-foreground">HOT</span>}
                <div className="font-display font-bold">💎 {p.amt}</div>
                <div className="text-xs text-muted-foreground">{game.unit}</div>
                <div className="mt-2 font-bold text-accent">${p.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
          {idConfig.requiresLookup && <p className="text-sm text-muted-foreground">កញ្ចប់ និងតម្លៃមិនទាន់មាន។</p>}
        </section>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">3</span>
            វិធីបង់ប្រាក់
          </h2>
          <div className="flex flex-wrap gap-2">
            {payments.map((m) => (
              <button key={m} onClick={() => setPay(m)} data-active={pay === m}
                className="chip-3d px-5 py-2 text-sm font-semibold">{m}</button>
            ))}
          </div>
        </section>

        <aside className="card-3d mt-5 rounded-3xl p-5">
          <h3 className="font-display text-lg font-bold">សង្ខេបការបញ្ជាទិញ</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">ហ្គេម</dt><dd>{game.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">ID</dt><dd>{uid || "—"}{zone && ` (${zone})`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">កញ្ចប់</dt><dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">បង់ប្រាក់</dt><dd>{pay}</dd></div>
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
    </SiteChrome>
  );
}
