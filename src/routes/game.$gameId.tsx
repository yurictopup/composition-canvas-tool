import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { findGame, getHotItems, getPackages, payments, store } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { useStorePrefs } from "@/lib/storePrefs";
import { OrderPayment } from "@/components/OrderPayment";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import { lookupPlayer } from "@/lib/player-lookup.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, Check, CircleAlert, CircleCheck, Receipt, ShoppingCart, Sparkles, Star, Wallet } from "lucide-react";
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
  const { t } = useStorePrefs();
  const navigate = useNavigate();
  const game = findGame(gameId);
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; msg: string; name?: string } | null>(null);
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
  const hotItems = getHotItems(gameId).map((item) => ({
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
      setCheck({ ok: true, msg: "ID is valid, ready to order" });
      return;
    }
    const seq = ++checkSeq.current;
    setChecking(true);
    setCheck(null);
    let next: { ok: boolean; msg: string; name?: string };
    try {
      const result = await lookupPlayer({ data: { gameId, primary: uid, secondary: zone || undefined } });
      if (result.status === "found") next = { ok: true, msg: "User verified:", name: result.name };
      else if (result.status === "not_found") next = { ok: false, msg: "User ID not found" };
      // No supplier name check for this game yet: a well-formed ID may still
      // order, and the owner delivers it by hand from /admin.
      else if (result.status === "unsupported") next = { ok: true, msg: "ID format is correct, please double-check it before paying" };
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
    if (!game || !canBuy || !selected || selected.price === null) return;
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
    } catch (e) {
      const message = (e as { message?: string } | null)?.message;
      setOrderErr(message ?? "Order failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Order Success Screen ──────────────────────────────────────────────
  if (orderId) {
    return (
      <SiteChrome>
        <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
          <div className="card-3d rounded-3xl p-6 sm:p-8">
            {/* Payment: the order's own KHQR, or manual instructions when Bakong isn't set up */}
            <OrderPayment
              orderId={orderId}
              summary={{
                code: orderId.slice(0, 8).toUpperCase(),
                game: game.name,
                item: `${selected?.amt ?? ""} ${game.unit}`.trim(),
                amount: paidPrice ?? selected?.price ?? undefined,
              }}
              fallback={
                <div className="rounded-2xl bg-muted/50 p-5 text-left">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("Order")} #{orderId.slice(0, 8).toUpperCase()} · {game.name} {selected?.amt} {game.unit}
                  </p>
                  <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                    <Wallet className="h-4 w-4 text-primary" />
                    Payment Instructions
                  </h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Open <strong>Bakong</strong> app</p>
                    <p>2. Scan QR ឬ Transfer ទៅ:</p>
                    <div className="rounded-xl bg-card border px-4 py-3 mt-2">
                      <p className="font-bold text-foreground text-base">Yuric Topup</p>
                      <p className="text-xs mt-1">Telegram: <a href={`https://t.me/${store.telegram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold">{store.telegram}</a></p>
                    </div>
                    <p className="mt-2">3. Amount: <strong className="text-accent text-base">${(paidPrice ?? selected?.price)?.toFixed(2)}</strong></p>
                    <p>4. Note/Description: <strong className="text-foreground">{orderId.slice(0,8).toUpperCase()}</strong></p>
                    <p className="mt-2">5. Screenshot ផ្ញើ Telegram — diamonds ចូល 1-5 នាទី</p>
                  </div>
                </div>
              }
            />

            <Link
              to="/profile"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-sans text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Receipt className="h-4 w-4" />
              {t("My orders")}
            </Link>

            <p className="mt-5 text-center text-[11px] text-muted-foreground/80">
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
        <Link to="/" hash="games" className="text-sm text-on-dark-muted transition-colors hover:text-on-dark">← {t("Back to games")}</Link>

        <div className="card-3d mt-3 flex items-center gap-4 rounded-3xl p-5">
          <span className="tile-clean block w-20 shrink-0 rounded-[26%] sm:w-24">
            <img src={game.icon} alt={game.name} width={151} height={151} className="block aspect-square w-full object-cover" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-black">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{game.blurb} · {t("Delivered in 1-5 minutes")}</p>
          </div>
        </div>

        {/* Step 1 — Player ID */}
        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">1</span>
            {t("Enter Player ID")}
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); void runCheck(); }}
            className={`grid items-end gap-3 ${idConfig.secondary ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              {idConfig.primary.label}
              <input value={uid} onChange={(e) => { setUid(e.target.value); resetCheck(); }}
                placeholder={idConfig.primary.placeholder}
                inputMode={idConfig.primary.numeric ? "numeric" : "text"}
                autoComplete="off" spellCheck={false}
                className={`min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`} />
            </label>
            {idConfig.secondary && (
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                {idConfig.secondary.label}
                {idConfig.secondary.options ? (
                  <select value={zone} onChange={(e) => { setZone(e.target.value); resetCheck(); }}
                    className={`h-12 min-w-0 rounded-lg border bg-input px-4 font-normal outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`}>
                    <option value="">{idConfig.secondary.placeholder}</option>
                    {idConfig.secondary.options.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={zone} onChange={(e) => { setZone(e.target.value); resetCheck(); }}
                    placeholder={idConfig.secondary.placeholder}
                    inputMode={idConfig.secondary.numeric ? "numeric" : "text"}
                    autoComplete="off" spellCheck={false}
                    className={`min-w-0 rounded-lg border bg-input px-4 py-3 font-normal outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`} />
                )}
              </label>
            )}
            <Button type="submit" disabled={checking} className="h-12 px-6 font-bold">{checking ? t("Checking…") : t("Check ID")}</Button>
          </form>
          {check && (
            <p
              role="status"
              className={`mt-3 flex items-start gap-2 font-sans text-sm leading-relaxed ${check.ok ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
            >
              {check.ok ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {t(check.msg)}
                {check.name && <strong className="ml-1 font-bold">{check.name}</strong>}
              </span>
            </p>
          )}
          {gameId === "roblox" && (
            <p className="mt-3 text-sm text-muted-foreground">{t("We send Robux to this Roblox username. We never ask for your password.")}</p>
          )}
        </section>

        {/* Step 2 — Package */}
        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">2</span>
            {t("Choose a package")}
          </h2>

          {hotItems.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-600"><Sparkles className="h-4 w-4" /> {t("Recommended for You")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {hotItems.map((item, i) => (
                  <button key={item.label} onClick={() => selectHot(i)}
                    className={`relative flex items-center justify-between gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 py-4 pl-4 pr-3 text-left shadow-[0_4px_14px_rgba(245,158,11,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(245,158,11,0.3)] ${hotPkg === i ? "border-amber-400 ring-2 ring-amber-300" : "border-amber-200"}`}>
                    <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-3 w-3 fill-current" /> {item.badge ?? "TOP"}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-sm font-bold leading-tight sm:text-base ${hotPkg === i ? "text-amber-700" : "text-card-foreground"}`}>{item.label}</div>
                      {item.note && <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{t(item.note)}</div>}
                      <div className="mt-1 text-sm font-bold text-amber-600">{item.price !== null ? `$${item.price.toFixed(2)}` : "—"}</div>
                    </div>
                    <span className="relative mt-3 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-100 shadow-inner">
                      <img src={item.img} alt={item.label} className="h-10 w-12 object-contain" />
                      {hotPkg === i && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white shadow"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                    </span>
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
                  <CurrencyIcon gameId={game.id} className={`h-9 w-9 shrink-0 transition-transform ${pkg === i && hotPkg === null ? "scale-125" : ""}`} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("No packages available yet.")}</p>
          )}
        </section>

        {/* Step 3 — Payment */}
        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="mb-4 flex items-center gap-3 font-khmer text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">3</span>
            {t("Choose a payment method")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {payments.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPay(m)}
                aria-pressed={pay === m}
                className={`relative flex aspect-square w-44 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 bg-white px-4 text-center text-[#142650] transition ${
                  pay === m
                    ? "border-[#2f5fe0] shadow-[0_6px_18px_rgb(47_95_224/0.25)]"
                    : "border-[#dfe8f6] hover:border-[#2f5fe0]/50"
                }`}
              >
                <span
                  className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    pay === m ? "border-[#2f5fe0] bg-[#2f5fe0]" : "border-[#c5d3ea]"
                  }`}
                >
                  {pay === m && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <KhqrMark />
                <span className="block text-base font-bold">{m} KHQR</span>
                <span className="block text-[11px] leading-snug text-[#5b6b8c]">{t("Scan with ABA, ACLEDA, Wing or any bank app")}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Summary */}
        <aside className="card-3d mt-5 rounded-3xl p-5">
          <h3 className="font-khmer text-lg">{t("Order summary")}</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("Game")}</dt><dd>{game.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("Player ID")}</dt><dd>{uid || "—"}{zone && ` (${zone})`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("Package")}</dt><dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("Payment")}</dt><dd>{pay}</dd></div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">{t("Total")}</span>
            <span className="font-display text-3xl font-black text-accent">
              {selected?.price != null ? `$${selected.price.toFixed(2)}` : "—"}
            </span>
          </div>

          {orderErr && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-destructive"><CircleAlert className="h-4 w-4 shrink-0" />{orderErr}</p>
          )}

          <button
            disabled={!canBuy}
            onClick={handleBuy}
            className="btn-3d glow-pulse mt-5 w-full rounded-xl py-4 font-display font-bold disabled:opacity-40"
          >
            {busy ? t("Processing…") : <span className="inline-flex items-center gap-2"><ShoppingCart className="h-4 w-4" />{t("Place Order")}</span>}
          </button>

          {!check?.ok && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ArrowUp className="h-3.5 w-3.5" /> {t("Check your Player ID first to order")}
            </p>
          )}
        </aside>
      </main>
    </SiteChrome>
  );
}

// Red KHQR badge, the mark Cambodian bank apps show for Bakong QR payments.
function KhqrMark() {
  return (
    <span className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-[3px] bg-[#E1232E] text-white shadow-[0_3px_10px_rgb(225_35_46/0.35)]">
      <span className="text-xl font-extrabold leading-none tracking-wide">KHQR</span>
      <span className="mt-1.5 h-[3px] w-12 rounded bg-white/70" />
    </span>
  );
}
