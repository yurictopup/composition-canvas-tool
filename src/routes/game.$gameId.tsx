import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { findGame, getPackages, mlbbHotItems, payments, store } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { OrderPayment } from "@/components/OrderPayment";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import { lookupPlayer } from "@/lib/player-lookup.functions";
import { supabase } from "@/integrations/supabase/client";
import { livePrice, packageKey, useLivePrices } from "@/lib/prices";

export const Route = createFileRoute("/game/$gameId")({
  head: ({ params }) => {
    const game = findGame(params.gameId);
    const name = game?.name ?? "Game";
    const unit = game?.unit ?? "Diamonds";
    return {
      meta: [
        { title: `${name} — Yuric Topup` },
        { name: "description", content: `Top up ${unit} ${name} — fast and secure via Bakong.` },
        { property: "og:title", content: `${name} — Yuric Topup` },
        { property: "og:description", content: `Top up ${name} in 1-5 minutes via Bakong.` },
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
  const navigate = useNavigate();
  const game = findGame(gameId);
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const checkSeq = useRef(0);
  const [pkg, setPkg] = useState<number | null>(null);
  const [hotPkg, setHotPkg] = useState<number | null>(null);
  const [pay, setPay] = useState(payments[0] ?? "Bakong");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidPrice, setPaidPrice] = useState<number | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const prices = useLivePrices(gameId);

  if (!game) {
    return (
      <SiteChrome>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Game not found.</p>
        </main>
      </SiteChrome>
    );
  }

  const idConfig = getIdConfig(gameId);
  const availablePackages = getPackages(gameId).map((p) => ({
    ...p,
    price: livePrice(prices, gameId, packageKey(p.amt, game.unit), p.price),
  }));
  const hotItems = (gameId === "mlbb" ? mlbbHotItems : []).map((item) => ({
    ...item,
    price: livePrice(prices, gameId, packageKey(item.label, game.unit), item.price),
  }));
  const selected =
    hotPkg !== null
      ? { amt: hotItems[hotPkg]!.label, price: hotItems[hotPkg]!.price }
      : pkg !== null
      ? (availablePackages[pkg] ?? null)
      : null;
  const canBuy = !!check?.ok && !!selected && selected.price !== null && !busy;

  function selectPkg(i: number) { setPkg(i); setHotPkg(null); }
  function selectHot(i: number) { setHotPkg(i); setPkg(null); }

  function resetCheck() { checkSeq.current++; setCheck(null); setChecking(false); }

  async function runCheck() {
    const error = validatePlayerId(gameId, uid, zone);
    if (error) { setCheck({ ok: false, msg: error }); return; }
    if (!idConfig.requiresLookup) {
      setCheck({ ok: true, msg: `ID ${uid.trim()} valid — ready to order!` });
      return;
    }
    const seq = ++checkSeq.current;
    setChecking(true);
    setCheck(null);
    let next: { ok: boolean; msg: string };
    try {
      const result = await lookupPlayer({ data: { gameId, primary: uid, secondary: zone || undefined } });
      if (result.status === "found") next = { ok: true, msg: `Nickname: ${result.name}` };
      else if (result.status === "not_found") next = { ok: false, msg: "Player not found. Please check your ID." };
      else if (result.status === "unsupported") next = { ok: false, msg: "Account name lookup is not available yet." };
      else next = { ok: false, msg: "Name check is busy right now. Please try again." };
    } catch {
      next = { ok: false, msg: "Name check is busy right now. Please try again." };
    }
    // Ignore answers for an ID the player has since changed.
    if (seq !== checkSeq.current) return;
    setCheck(next);
    setChecking(false);
  }

  async function handleBuy() {
    if (!canBuy || !selected || selected.price === null) return;
    setBusy(true);
    setOrderErr(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const { data, error } = await supabase.from("orders").insert({
        user_id: user.id,
        user_email: user.email ?? "",
        game_id: gameId,
        game_name: game.name,
        package_amt: `${selected.amt} ${game.unit}`,
        price_usd: selected.price,
        payment: pay,
        player_id: uid.trim(),
        player_zone: zone.trim() || null,
        status: "pending",
      }).select("id, price_usd").single();

      if (error) throw error;
      setOrderId(data.id);
      // The database sets the final price; show what was actually charged.
      setPaidPrice(Number(data.price_usd));
    } catch (e: any) {
      setOrderErr(e.message ?? "Order failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Order Success Screen ──────────────────────────────────────────────
  if (orderId) {
    return (
      <SiteChrome>
        <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
          <div className="card-3d rounded-3xl p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="font-display text-2xl font-black mb-2">Order Placed!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Order #{orderId.slice(0, 8).toUpperCase()} — {game.name} {selected?.amt} {game.unit}
            </p>

            {/* Payment: the order's own KHQR, or manual instructions when Bakong isn't set up */}
            <OrderPayment
              orderId={orderId}
              fallback={
                <div className="rounded-2xl bg-muted/50 p-5 text-left mb-6">
                  <h2 className="font-bold mb-3 text-base">💳 Payment Instructions</h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Open <strong>Bakong</strong> app</p>
                    <p>2. Scan QR ឬ Transfer ទៅ:</p>
                    <div className="rounded-xl bg-card border px-4 py-3 mt-2">
                      <p className="font-bold text-foreground text-base">Yuric Topup</p>
                      <p className="text-xs mt-1">Telegram: <a href={`https://t.me/${store.telegram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold">{store.telegram}</a></p>
                    </div>
                    <p className="mt-2">3. Amount: <strong className="text-accent text-base">${(paidPrice ?? selected?.price)?.toFixed(2)}</strong></p>
                    <p>4. Note/Description: <strong className="text-foreground">{orderId.slice(0,8).toUpperCase()}</strong></p>
                    <p className="mt-2">5. Screenshot ផ្ញើ Telegram — diamonds ចូល 1-5 នាទី ✨</p>
                  </div>
                </div>
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://t.me/${store.telegram.replace("@","")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-3d rounded-xl py-3 font-bold text-center text-sm"
              >
                📱 Contact Telegram
              </a>
              <Link to="/profile" className="rounded-xl border border-border py-3 font-semibold text-center text-sm hover:bg-muted transition-colors">
                📦 My Orders
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Order ID: {orderId}
            </p>
          </div>
        </main>
      </SiteChrome>
    );
  }

  // ── Main Order Form ───────────────────────────────────────────────────
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
            <p className="text-sm text-muted-foreground">{game.blurb} · Delivered in 1-5 minutes</p>
          </div>
        </div>

        {/* Step 1 — Player ID */}
        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">1</span>
            បញ្ចូល Player ID
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); void runCheck(); }}
            className={`grid items-end gap-3 ${idConfig.secondary ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              {idConfig.primary.label}
              <input value={uid} onChange={(e) => { setUid(e.target.value); resetCheck(); }}
                placeholder={idConfig.primary.placeholder}
                inputMode={idConfig.primary.numeric ? "numeric" : "text"}
                autoComplete="off" spellCheck={false}
                className="min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary" />
            </label>
            {idConfig.secondary && (
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                {idConfig.secondary.label}
                {idConfig.secondary.options ? (
                  <select value={zone} onChange={(e) => { setZone(e.target.value); resetCheck(); }}
                    className="h-12 min-w-0 rounded-lg border bg-input px-4 font-normal outline-none focus:border-primary">
                    <option value="">{idConfig.secondary.placeholder}</option>
                    {idConfig.secondary.options.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={zone} onChange={(e) => { setZone(e.target.value); resetCheck(); }}
                    placeholder={idConfig.secondary.placeholder}
                    inputMode={idConfig.secondary.numeric ? "numeric" : "text"}
                    autoComplete="off" spellCheck={false}
                    className="min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary" />
                )}
              </label>
            )}
            <Button type="submit" disabled={checking} className="h-12 px-6 font-bold">{checking ? "Checking…" : "Check ID"}</Button>
          </form>
          {check && (
            <p role="status" className={`mt-3 text-sm font-semibold ${check.ok ? "text-primary" : "text-destructive"}`}>
              {check.ok ? "✅" : "⚠️"} {check.msg}
            </p>
          )}
          {gameId === "roblox" && (
            <p className="mt-3 text-sm text-muted-foreground">Roblox uses Gift Cards — Robux cannot be topped up directly by User ID.</p>
          )}
        </section>

        {/* Step 2 — Package */}
        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">2</span>
            ជ្រើសរើសកញ្ចប់ពេជ្រ
          </h2>

          {hotItems.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-500">🔥 Hot Items</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {hotItems.map((item, i) => (
                  <button key={item.label} onClick={() => selectHot(i)}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${hotPkg === i ? "border-rose-400 bg-rose-100 ring-2 ring-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.25)]" : "border-rose-100 bg-rose-50"}`}>
                    <div>
                      <div className={`text-sm font-bold ${hotPkg === i ? "text-rose-600" : "text-card-foreground"}`}>{item.label}</div>
                      <div className="text-sm font-bold text-rose-500">{item.price !== null ? `$${item.price.toFixed(2)}` : "—"}</div>
                    </div>
                    <img src={item.img} alt={item.label} className={`h-12 w-12 shrink-0 rounded-full object-cover transition-transform ${hotPkg === i ? "scale-110" : ""}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {availablePackages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {availablePackages.map((p, i) => (
                <button key={p.amt} onClick={() => selectPkg(i)}
                  className={`relative flex items-center justify-between rounded-2xl border px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${pkg === i && hotPkg === null ? "border-primary bg-primary/10 ring-2 ring-primary shadow-[0_0_16px_oklch(0.42_0.19_266/0.35)]" : "border-border/60 bg-white"}`}>
                  {p.hot && <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">HOT</span>}
                  <div>
                    <div className={`text-base font-bold ${pkg === i && hotPkg === null ? "text-primary" : "text-card-foreground"}`}>{p.amt}</div>
                    <div className="text-xs text-muted-foreground">{game.unit}</div>
                    <div className={`mt-1 text-sm font-bold ${pkg === i && hotPkg === null ? "text-primary" : "text-primary/70"}`}>
                      {p.price !== null ? `$${p.price.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <span className={`text-2xl transition-transform ${pkg === i && hotPkg === null ? "scale-125" : ""}`}>💎</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No packages available yet.</p>
          )}
        </section>

        {/* Step 3 — Payment */}
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

        {/* Summary */}
        <aside className="card-3d mt-5 rounded-3xl p-5">
          <h3 className="font-khmer text-lg">សង្ខេបការបញ្ជាទិញ</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Game</dt><dd>{game.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Player ID</dt><dd>{uid || "—"}{zone && ` (${zone})`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Package</dt><dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{pay}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-3xl font-black text-accent">
              {selected?.price != null ? `$${selected.price.toFixed(2)}` : "—"}
            </span>
          </div>

          {orderErr && (
            <p className="mt-3 text-center text-sm text-destructive font-semibold">⚠️ {orderErr}</p>
          )}

          <button
            disabled={!canBuy}
            onClick={handleBuy}
            className="btn-3d glow-pulse mt-5 w-full rounded-xl py-4 font-display font-bold disabled:opacity-40"
          >
            {busy ? "Processing…" : "🛒 Place Order"}
          </button>

          {!check?.ok && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              ⬆️ Check Player ID ជាមុន ដើម្បី order
            </p>
          )}
        </aside>
      </main>
    </SiteChrome>
  );
}
