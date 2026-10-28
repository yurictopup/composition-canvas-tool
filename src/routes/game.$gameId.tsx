import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { packageSlotKey, useSiteImage, useSlotImage } from "@/lib/site-images";
import { useRef, useState } from "react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import {
  baseGameId,
  findGame,
  getHotItems,
  getPackages,
  payments,
  robloxGamePassPrice,
  store,
} from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { useStorePrefs } from "@/lib/storePrefs";
import { OrderPayment } from "@/components/OrderPayment";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import { lookupPlayer } from "@/lib/player-lookup.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUp,
  Check,
  CircleAlert,
  CircleCheck,
  Package,
  Receipt,
  ShoppingCart,
  Sparkles,
  Star,
  Ticket,
  Wallet,
} from "lucide-react";
import { livePackages, livePrice, packageKey, useLivePrices } from "@/lib/prices";

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
  const pic = useSiteImage();
  const slotPic = useSlotImage();
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

  // Server variants (e.g. MLBB Philippines) share the main game's ID rules and name check.
  const idGameId = baseGameId(gameId);
  const idConfig = getIdConfig(idGameId);
  const availablePackages = livePackages(
    prices,
    gameId,
    game.unit,
    getPackages(gameId),
    getHotItems(gameId).map((h) => h.label),
  ) as { amt: string; price: number | null; hot?: boolean }[];
  const hotItems = getHotItems(gameId).map((item) => ({
    ...item,
    price: livePrice(prices, gameId, packageKey(item.label, game.unit), item.price),
  }));
  // Badged items (the bundle) run full width on top; the rest sit in centred rows below.
  const featuredHot = hotItems.filter((item) => item.img && item.badge);
  const pictureHot = hotItems.filter((item) => item.img && !item.badge);
  // Passes and packs without artwork list as plain cards under "More items".
  const moreItems = hotItems.filter((item) => !item.img);
  function renderHot(item: (typeof hotItems)[number], wide = false) {
    const i = hotItems.indexOf(item);
    return (
      <button
        key={item.label}
        type="button"
        onClick={() => selectHot(i)}
        className={`relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 ${wide ? "px-5 py-5 sm:px-6" : "py-2.5 pl-3.5 pr-3"} text-left shadow-[0_4px_14px_rgba(245,158,11,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(245,158,11,0.3)] ${hotPkg === i ? "border-amber-400 ring-2 ring-amber-300" : "border-amber-200"}`}
      >
        <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
          <Star className="h-3 w-3 fill-current" /> {item.badge ?? "TOP"}
        </span>
        <div className="min-w-0">
          <div
            className={`font-bold leading-tight ${wide ? "text-base sm:text-lg" : "text-sm sm:text-base"} ${hotPkg === i ? "text-amber-700" : "text-card-foreground"}`}
          >
            {item.label}
          </div>
          {item.note && (
            <div
              className={`mt-0.5 text-[11px] text-muted-foreground ${wide ? "sm:text-xs" : "hidden sm:block"}`}
            >
              {t(item.note)}
            </div>
          )}
          <div className={`mt-0.5 font-bold text-amber-600 ${wide ? "text-lg" : "text-sm"}`}>
            {item.price !== null ? `$${item.price.toFixed(2)}` : "—"}
          </div>
        </div>
        <span
          className={`relative grid shrink-0 place-items-center rounded-full bg-amber-100 shadow-inner ${wide ? "mt-2 h-20 w-32 sm:w-40" : "mt-2 h-11 w-11"}`}
        >
          <img
            src={pic(item.img!)}
            alt={item.label}
            className={wide ? "h-16 w-28 object-contain sm:w-36" : "h-8 w-10 object-contain"}
          />
          {hotPkg === i && (
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white shadow">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </span>
      </button>
    );
  }
  const selected =
    hotPkg !== null
      ? { amt: hotItems[hotPkg]!.label, price: hotItems[hotPkg]!.price }
      : pkg !== null
        ? (availablePackages[pkg] ?? null)
        : null;
  const canBuy = !!check?.ok && !!selected && selected.price !== null && !busy;

  function selectPkg(i: number) {
    setPkg(i);
    setHotPkg(null);
  }
  function selectHot(i: number) {
    setHotPkg(i);
    setPkg(null);
  }

  function resetCheck() {
    checkSeq.current++;
    setCheck(null);
    setChecking(false);
  }

  async function runCheck() {
    const error = validatePlayerId(idGameId, uid, zone);
    if (error) {
      setCheck({ ok: false, msg: error });
      return;
    }
    if (!idConfig.requiresLookup) {
      setCheck({ ok: true, msg: "ID is valid, ready to order" });
      return;
    }
    const seq = ++checkSeq.current;
    setChecking(true);
    setCheck(null);
    let next: { ok: boolean; msg: string; name?: string };
    try {
      const result = await lookupPlayer({
        data: { gameId: idGameId, primary: uid, secondary: zone || undefined },
      });
      if (result.status === "found") next = { ok: true, msg: "User verified:", name: result.name };
      else if (result.status === "not_found") next = { ok: false, msg: "User ID not found" };
      // No supplier name check for this game yet: a well-formed ID may still
      // order, and the owner delivers it by hand from /admin.
      else if (result.status === "unsupported")
        next = { ok: true, msg: "ID format is correct, please double-check it before paying" };
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .insert({
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
        })
        .select("id, price_usd")
        .single();

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
                    {t("Order")} #{orderId.slice(0, 8).toUpperCase()} · {game.name} {selected?.amt}{" "}
                    {game.unit}
                  </p>
                  <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                    <Wallet className="h-4 w-4 text-primary" />
                    Payment Instructions
                  </h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      1. Open <strong>Bakong</strong> app
                    </p>
                    <p>2. Scan QR ឬ Transfer ទៅ:</p>
                    <div className="rounded-xl bg-card border px-4 py-3 mt-2">
                      <p className="font-bold text-foreground text-base">Yuric Topup</p>
                      <p className="text-xs mt-1">
                        Telegram:{" "}
                        <a
                          href={`https://t.me/${store.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-semibold"
                        >
                          {store.telegram}
                        </a>
                      </p>
                    </div>
                    <p className="mt-2">
                      3. Amount:{" "}
                      <strong className="text-accent text-base">
                        ${(paidPrice ?? selected?.price)?.toFixed(2)}
                      </strong>
                    </p>
                    <p>
                      4. Note/Description:{" "}
                      <strong className="text-foreground">
                        {orderId.slice(0, 8).toUpperCase()}
                      </strong>
                    </p>
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
      <main className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-6 sm:py-8">
        <Link
          to="/"
          hash="games"
          className="text-xs text-on-dark-muted transition-colors hover:text-on-dark sm:text-sm"
        >
          ← {t("Back to games")}
        </Link>

        <div className="card-3d mt-2 flex items-center gap-3 rounded-2xl p-3 sm:mt-3 sm:gap-4 sm:rounded-3xl sm:p-5">
          <span className="tile-clean block w-14 shrink-0 rounded-[26%] sm:w-24">
            <img
              src={pic(game.icon)}
              alt={game.name}
              width={151}
              height={151}
              className="block aspect-square w-full object-cover"
            />
          </span>
          <div>
            <h1 className="font-display text-lg font-black sm:text-2xl">{game.name}</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {game.blurb} · {t("Delivered in 1-5 minutes")}
            </p>
          </div>
        </div>

        {/* Step 1 — Player ID */}
        <section className="card-3d mt-3 rounded-2xl p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
          <h2 className="mb-3 flex items-center gap-2.5 font-khmer text-base sm:mb-4 sm:gap-3 sm:text-lg">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground sm:h-8 sm:w-8">
              1
            </span>
            {t("Enter Player ID")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runCheck();
            }}
            className={`grid items-end gap-3 ${idConfig.secondary ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"}`}
          >
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold sm:gap-2">
              {idConfig.primary.label}
              <input
                value={uid}
                onChange={(e) => {
                  setUid(e.target.value);
                  resetCheck();
                }}
                placeholder={idConfig.primary.placeholder}
                inputMode={idConfig.primary.numeric ? "numeric" : "text"}
                autoComplete="off"
                spellCheck={false}
                className={`min-w-0 rounded-lg border bg-input px-3 py-2 font-normal sm:px-4 sm:py-3 outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`}
              />
            </label>
            {idConfig.secondary && (
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold sm:gap-2">
                {idConfig.secondary.label}
                {idConfig.secondary.options ? (
                  <select
                    value={zone}
                    onChange={(e) => {
                      setZone(e.target.value);
                      resetCheck();
                    }}
                    className={`h-11 min-w-0 rounded-lg border bg-input px-3 font-normal sm:h-12 sm:px-4 outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`}
                  >
                    <option value="">{idConfig.secondary.placeholder}</option>
                    {idConfig.secondary.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={zone}
                    onChange={(e) => {
                      setZone(e.target.value);
                      resetCheck();
                    }}
                    placeholder={idConfig.secondary.placeholder}
                    inputMode={idConfig.secondary.numeric ? "numeric" : "text"}
                    autoComplete="off"
                    spellCheck={false}
                    className={`min-w-0 rounded-lg border bg-input px-3 py-2 font-normal sm:px-4 sm:py-3 outline-none focus:border-primary ${check && !check.ok ? "border-red-500" : ""}`}
                  />
                )}
              </label>
            )}
            <Button type="submit" disabled={checking} className="h-10 px-6 font-bold sm:h-12">
              {checking ? t("Checking…") : t("Check ID")}
            </Button>
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
        </section>

        {/* Step 2 — Package */}
        <section className="card-3d mt-3 rounded-2xl p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
          <h2 className="mb-3 flex items-center gap-2.5 font-khmer text-base sm:mb-4 sm:gap-3 sm:text-lg">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground sm:h-8 sm:w-8">
              2
            </span>
            {t("Choose a package")}
          </h2>

          {featuredHot.length + pictureHot.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-600">
                <Sparkles className="h-4 w-4" /> {t("Recommended for You")}
              </p>
              {featuredHot.length > 0 && (
                <div className="mb-3 space-y-3">
                  {featuredHot.map((item) => renderHot(item, true))}
                </div>
              )}
              <div className="mb-3 flex flex-wrap justify-center gap-3">
                {pictureHot.map((item) => (
                  <div
                    key={item.label}
                    className="w-[calc(50%-0.375rem)] sm:w-[calc((100%-1.5rem)/3)]"
                  >
                    {renderHot(item)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {availablePackages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
              {availablePackages.map((p, i) => (
                <button
                  key={p.amt}
                  onClick={() => selectPkg(i)}
                  className={`relative flex items-center justify-between rounded-xl border px-2.5 py-2 text-left sm:rounded-2xl sm:px-4 sm:py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${pkg === i && hotPkg === null ? "border-primary bg-primary/10 ring-2 ring-primary shadow-[0_0_16px_oklch(0.42_0.19_266/0.35)]" : "border-border/60 bg-white"}`}
                >
                  {p.hot && (
                    <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">
                      HOT
                    </span>
                  )}
                  <div>
                    <div
                      className={`text-sm font-bold sm:text-base ${pkg === i && hotPkg === null ? "text-primary" : "text-card-foreground"}`}
                    >
                      {p.amt}
                    </div>
                    <div className="text-xs text-muted-foreground">{game.unit}</div>
                    <div
                      className={`mt-1 text-sm font-bold ${pkg === i && hotPkg === null ? "text-primary" : "text-primary/70"}`}
                    >
                      {p.price !== null ? `$${p.price.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  {slotPic(packageSlotKey(gameId, p.amt)) ? (
                    <img
                      src={slotPic(packageSlotKey(gameId, p.amt))}
                      alt={`${p.amt} ${game.unit}`}
                      className={`h-10 w-10 shrink-0 rounded-lg object-contain transition-transform sm:h-14 sm:w-14 ${pkg === i && hotPkg === null ? "scale-110" : ""}`}
                    />
                  ) : (
                    <CurrencyIcon
                      gameId={idGameId}
                      className={`h-7 w-7 shrink-0 transition-transform sm:h-9 sm:w-9 ${pkg === i && hotPkg === null ? "scale-125" : ""}`}
                    />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("No packages available yet.")}</p>
          )}

          {gameId === "roblox" && (
            <RobloxGamePassSteps
              robux={pkg !== null ? Number(availablePackages[pkg]?.amt) : null}
            />
          )}

          {moreItems.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <Package className="h-4 w-4" /> {t("More items")}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {moreItems.map((item) => {
                  const i = hotItems.indexOf(item);
                  const on = hotPkg === i;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => selectHot(i)}
                      className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${on ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border/60 bg-white"}`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-bold leading-tight ${on ? "text-primary" : "text-card-foreground"}`}
                        >
                          {item.label}
                        </div>
                        <div
                          className={`mt-1 text-sm font-bold ${on ? "text-primary" : "text-primary/70"}`}
                        >
                          {item.price !== null ? `$${item.price.toFixed(2)}` : "—"}
                        </div>
                      </div>
                      {slotPic(`item:${gameId}:${item.label}`) ? (
                        <img
                          src={slotPic(`item:${gameId}:${item.label}`)}
                          alt={item.label}
                          className={`h-11 w-11 shrink-0 rounded-lg object-contain transition-transform ${on ? "scale-110" : ""}`}
                        />
                      ) : (
                        <CurrencyIcon
                          gameId={idGameId}
                          className={`h-8 w-8 shrink-0 transition-transform ${on ? "scale-125" : ""}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Step 3 — Payment */}
        <section className="card-3d mt-3 rounded-2xl p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
          <h2 className="mb-3 flex items-center gap-2.5 font-khmer text-base sm:mb-4 sm:gap-3 sm:text-lg">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground sm:h-8 sm:w-8">
              3
            </span>
            {t("Choose a payment method")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {payments.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPay(m)}
                aria-pressed={pay === m}
                className={`relative flex aspect-square w-36 flex-col items-center justify-center gap-2 sm:w-44 sm:gap-2.5 rounded-2xl border-2 bg-white px-4 text-center text-[#142650] transition ${
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
                <span className="block text-[11px] leading-snug text-[#5b6b8c]">
                  {t("Scan with ABA, ACLEDA, Wing or any bank app")}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Summary */}
        <aside className="card-3d mt-3 rounded-2xl p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
          <h3 className="font-khmer text-base sm:text-lg">{t("Order summary")}</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Game")}</dt>
              <dd>{game.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Player ID")}</dt>
              <dd>
                {uid || "—"}
                {zone && ` (${zone})`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Package")}</dt>
              <dd>{selected ? `${selected.amt} ${game.unit}` : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Payment")}</dt>
              <dd>{pay}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">{t("Total")}</span>
            <span className="font-display text-2xl font-black text-accent sm:text-3xl">
              {selected?.price != null ? `$${selected.price.toFixed(2)}` : "—"}
            </span>
          </div>

          {orderErr && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-destructive">
              <CircleAlert className="h-4 w-4 shrink-0" />
              {orderErr}
            </p>
          )}

          <button
            disabled={!canBuy}
            onClick={handleBuy}
            className="btn-3d glow-pulse mt-4 w-full rounded-xl py-3 sm:mt-5 sm:py-4 font-display font-bold disabled:opacity-40"
          >
            {busy ? (
              t("Processing…")
            ) : (
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t("Place Order")}
              </span>
            )}
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
    <span className="flex h-12 w-20 shrink-0 sm:h-16 sm:w-24 flex-col items-center justify-center rounded-[3px] bg-[#E1232E] text-white shadow-[0_3px_10px_rgb(225_35_46/0.35)]">
      <span className="text-xl font-extrabold leading-none tracking-wide">KHQR</span>
      <span className="mt-1.5 h-[3px] w-12 rounded bg-white/70" />
    </span>
  );
}

// Robux go to the buyer through a Game Pass the buyer creates, so they need its price before paying.
function RobloxGamePassSteps({ robux }: { robux: number | null }) {
  const { lang } = useStorePrefs();
  const pass = robux ? robloxGamePassPrice(robux) : null;
  const km = lang === "km";
  const steps = km
    ? [
        "ចូល create.roblox.com ហើយបង្កើត Game Pass ក្នុងហ្គេម (Experience) របស់អ្នក",
        pass
          ? `ដាក់តម្លៃ Game Pass ${pass} Robux (Roblox កាត់ 30% អ្នកនឹងទទួលបាន ${robux} Robux)`
          : "ជ្រើសកញ្ចប់ខាងលើ ដើម្បីដឹងតម្លៃ Game Pass ដែលត្រូវដាក់",
        "បញ្ចូល Username ខាងលើ ហើយបង់ប្រាក់ យើងនឹងទិញ Game Pass របស់អ្នក",
        "Robux ចូលគណនីក្រោយ 5 ទៅ 7 ថ្ងៃ (Pending) យើងមិនសុំលេខសម្ងាត់ទេ",
      ]
    : [
        "Go to create.roblox.com and create a Game Pass in one of your experiences.",
        pass
          ? `Set the Game Pass price to ${pass} Robux (Roblox keeps 30%, so you receive ${robux} Robux).`
          : "Pick a package above to see the Game Pass price to set.",
        "Enter your username above and pay. We buy your Game Pass.",
        "Robux arrive after 5 to 7 days (pending). We never ask for your password.",
      ];
  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
        <Ticket className="h-4 w-4" />{" "}
        {km ? "របៀបទទួល Robux តាម Game Pass" : "How to receive Robux by Game Pass"}
      </p>
      <ol className="list-decimal space-y-1 pl-5 font-sans text-sm leading-relaxed text-card-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
