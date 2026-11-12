import { createFileRoute, Link } from "@tanstack/react-router";
import { packageSlotKey, useSiteImage, useSlotImage } from "@/lib/site-images";
import { useEffect, useRef, useState } from "react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import {
  baseGameId,
  findGame,
  getHotItems,
  getPackages,
  packagePictures,
  payments,
  store,
  telegramTabs,
} from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { useStorePrefs } from "@/lib/storePrefs";
import { OrderPayment } from "@/components/OrderPayment";
import { Button } from "@/components/ui/button";
import { getIdConfig, validatePlayerId } from "@/lib/player-id";
import { lookupPlayer } from "@/lib/player-lookup.functions";
import { supabase } from "@/integrations/supabase/client";
import { placeGuestOrder } from "@/lib/guest-order.functions";
import { checkPromo } from "@/lib/promo.functions";
import { gameImageUrls } from "@/lib/image-preload";
import { guestOrderPath, saveGuestOrder } from "@/lib/guest-orders";
import {
  ArrowUp,
  Check,
  Clock,
  Copy,
  Link2,
  CircleAlert,
  CircleCheck,
  Lock,
  Package,
  Receipt,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Ticket,
  Wallet,
  Zap,
} from "lucide-react";
import { livePackages, livePrice, packageKey, useLivePrices } from "@/lib/prices";
import { gameOnSale, useStoreStatus } from "@/lib/store-status";

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
      // Pictures the page will show, fetched while its code loads (no pieces popping in).
      links: gameImageUrls(params.gameId)
        .slice(0, 14)
        .map((href) => ({ rel: "preload", as: "image", href })),
    };
  },
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  return <GamePage key={gameId} gameId={gameId} />;
}

function GamePage({ gameId }: { gameId: string }) {
  const { t, lang } = useStorePrefs();
  const km = lang === "km";
  const pic = useSiteImage();
  const slotPic = useSlotImage();
  const game = findGame(gameId);
  const [uid, setUid] = useState("");
  const [zone, setZone] = useState("");
  const isTelegram = telegramTabs.some((tab) => tab.id === gameId);
  // Keep the typed username when switching between Telegram Premium and Stars.
  useEffect(() => {
    if (!isTelegram) return;
    try {
      const saved = sessionStorage.getItem(TG_USERNAME_KEY);
      if (saved) setUid(saved);
    } catch {
      // storage blocked: the field just starts empty
    }
  }, [isTelegram]);
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
  // Promo code: what was typed, and the price the server gave for it.
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{
    code: string;
    price: number;
    discount: number;
    percent: number;
    pkg: string;
  } | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  // Not signed in: the order is placed as a guest and opened again by its secret link.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const prices = useLivePrices(gameId);
  // Owner paused sales on /admin: no packages or prices, only "coming soon".
  const status = useStoreStatus();
  const onSale = status ? gameOnSale(status, gameId) : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

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
  // Once live prices load, items the owner switched off in the table are hidden, not shown as "—".
  const hotItems = getHotItems(gameId)
    .map((item) => ({
      ...item,
      price: livePrice(prices, gameId, packageKey(item.label, game.unit), item.price),
    }))
    .filter((item) => !prices || item.price !== null);
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
        className={`relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-[10px] border-2 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 ${wide ? "px-5 py-5 sm:px-6" : "py-2.5 pl-3.5 pr-3"} text-left shadow-[0_4px_14px_rgba(245,158,11,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(245,158,11,0.3)] ${hotPkg === i ? "border-amber-400 ring-2 ring-amber-300" : "border-amber-200"}`}
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
              className={`mt-0.5 text-[11px] text-muted-foreground ${wide ? "sm:text-xs" : ""}`}
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
  const selectedAmt = selected && game ? `${selected.amt} ${game.unit}` : null;
  // A code is priced for one package; choosing another package drops it.
  const appliedPromo = promo && promo.pkg === selectedAmt ? promo : null;
  const finalPrice = appliedPromo ? appliedPromo.price : (selected?.price ?? null);

  async function applyPromo() {
    if (!selectedAmt || !promoInput.trim()) return;
    setPromoBusy(true);
    setPromoErr(null);
    try {
      const quote = await checkPromo({
        data: { gameId, packageAmt: selectedAmt, code: promoInput.trim() },
      });
      if (quote.ok) {
        setPromo({ ...quote, pkg: selectedAmt });
        setPromoInput(quote.code);
      } else {
        setPromo(null);
        setPromoErr(quote.message);
      }
    } catch {
      setPromo(null);
      setPromoErr("Too many tries. Please wait a few minutes.");
    } finally {
      setPromoBusy(false);
    }
  }

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
      const packageAmt = `${selected.amt} ${game.unit}`;
      if (!user) {
        const guest = await placeGuestOrder({
          data: {
            gameId,
            packageAmt,
            playerId: uid.trim(),
            playerZone: zone.trim() || undefined,
            promoCode: appliedPromo?.code,
          },
        });
        saveGuestOrder({
          id: guest.orderId,
          token: guest.token,
          game: game.name,
          item: packageAmt,
          at: new Date().toISOString(),
        });
        setGuestToken(guest.token);
        setOrderId(guest.orderId);
        setPaidPrice(guest.price);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          user_email: user.email ?? "",
          game_id: gameId,
          game_name: game.name,
          package_amt: packageAmt,
          price_usd: selected.price,
          payment: pay,
          player_id: uid.trim(),
          player_zone: zone.trim() || null,
          promo_code: appliedPromo?.code ?? null,
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
              guestToken={guestToken}
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

            {guestToken ? (
              <GuestLinkBox
                path={guestOrderPath(orderId, guestToken)}
                copied={copied}
                onCopied={() => setCopied(true)}
              />
            ) : (
              <Link
                to="/profile"
                className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-sans text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Receipt className="h-4 w-4" />
                {t("My orders")}
              </Link>
            )}

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
      {/* Extra bottom room so the floating Yuric Bot never covers the Order button. */}
      <main className="mx-auto w-full max-w-[1200px] px-3 pb-24 pt-4 sm:px-6 sm:pb-28 sm:pt-8">
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

        {onSale !== true ? (
          <SalesPaused loading={onSale === null} />
        ) : (
          <>
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
                      if (isTelegram) {
                        try {
                          sessionStorage.setItem(TG_USERNAME_KEY, e.target.value);
                        } catch {
                          // storage blocked: switching tabs just clears the field
                        }
                      }
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
              {isTelegram && <TelegramSwitch current={gameId} />}

              {featuredHot.length + pictureHot.length > 0 && (
                <div className="mb-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-600">
                    <Sparkles className="h-4 w-4" /> {t("Recommended for You")}
                  </p>
                  {/* Bundles (badge) and passes share one row: four side by side when there are four. */}
                  <div className="mb-3 flex flex-wrap justify-center gap-3">
                    {[...featuredHot, ...pictureHot].map((item, _, row) => (
                      <div
                        key={item.label}
                        className={`w-[calc(50%-0.375rem)] ${
                          row.length >= 4
                            ? "sm:w-[calc((100%-2.25rem)/4)]"
                            : "sm:w-[calc((100%-1.5rem)/3)]"
                        }`}
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
                      className={`relative flex items-center justify-between rounded-[10px] border px-2.5 py-2 text-left sm:px-4 sm:py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${pkg === i && hotPkg === null ? "border-primary bg-primary/10 ring-2 ring-primary shadow-[0_0_16px_oklch(0.42_0.19_266/0.35)]" : "border-border/60 bg-white"}`}
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
                      {slotPic(packageSlotKey(gameId, p.amt)) || packagePictures[gameId]?.[p.amt] ? (
                        <img
                          src={slotPic(packageSlotKey(gameId, p.amt)) ?? packagePictures[gameId]?.[p.amt]}
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

              {gameId === "roblox" && <RobloxCodeSteps />}
              {(gameId === "tgstars" || gameId === "tgpremium") && (
                <TelegramSteps premium={gameId === "tgpremium"} />
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
                          className={`flex items-center justify-between gap-2 rounded-[10px] border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${on ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border/60 bg-white"}`}
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
                          {slotPic(`item:${gameId}:${item.label}`) || item.icon ? (
                            <img
                              src={slotPic(`item:${gameId}:${item.label}`) ?? item.icon}
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
              <div className="grid gap-3">
                {payments.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPay(m)}
                    aria-pressed={pay === m}
                    className={`relative flex w-full items-center gap-3.5 rounded-2xl border-2 bg-gradient-to-br from-white to-[#f2f6ff] p-3.5 text-left text-[#142650] transition sm:gap-4 sm:p-4 ${
                      pay === m
                        ? "border-[#2f5fe0] shadow-[0_8px_24px_rgb(47_95_224/0.18)] ring-4 ring-[#2f5fe0]/10"
                        : "border-[#dfe8f6] hover:border-[#2f5fe0]/50"
                    }`}
                  >
                    <AbaMark />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold sm:text-lg">ABA KHQR</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Zap className="h-3 w-3" />
                          {km ? "ភ្លាមៗ" : "Instant"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#5b6b8c]">
                        {t("Scan with ABA, ACLEDA, Wing or any bank app")}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {["ABA", "ACLEDA", "Wing", "Bakong", "Canadia"].map((bank) => (
                          <span
                            key={bank}
                            className="rounded-md border border-[#dfe8f6] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#3a4a6b]"
                          >
                            {bank}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        pay === m ? "border-[#2f5fe0] bg-[#2f5fe0] text-white" : "border-[#c5d3ea]"
                      }`}
                    >
                      {pay === m && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                {km
                  ? "នៅលើទូរស័ព្ទ កម្មវិធីធនាគារនឹងបើកដោយខ្លួនឯង ពេលអ្នកចុចបញ្ជាទិញ"
                  : "On a phone, your bank app opens by itself when you place the order."}
              </p>
            </section>

            {/* Summary */}
            <aside className="card-3d mt-3 rounded-2xl p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-khmer text-base sm:text-lg">{t("Order summary")}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {km ? "មានសុវត្ថិភាព" : "Secure"}
                </span>
              </div>
              <dl className="mt-4 divide-y divide-[#e6edf8] rounded-xl border border-[#e6edf8] bg-white/70 text-sm">
                <div className="flex justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-muted-foreground">{t("Game")}</dt>
                  <dd className="text-right font-semibold">{game.name}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-muted-foreground">{t("Player ID")}</dt>
                  <dd className="text-right font-semibold">
                    {uid || "—"}
                    {zone && ` (${zone})`}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-muted-foreground">{t("Package")}</dt>
                  <dd className="text-right font-semibold">
                    {selected ? `${selected.amt} ${game.unit}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-muted-foreground">{t("Payment")}</dt>
                  <dd className="text-right font-semibold">ABA KHQR</dd>
                </div>
              </dl>
              {/* Promo code */}
              <div className="mt-3 rounded-xl border border-dashed border-[#c9d6ef] bg-white/60 p-3">
                <label
                  htmlFor="promo-code"
                  className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#142650]"
                >
                  <Ticket className="h-4 w-4 text-[#2f5fe0]" />
                  {km ? "លេខកូដបញ្ចុះតម្លៃ" : "Promo code"}
                </label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-emerald-700">
                      <CircleCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {appliedPromo.code} · -{appliedPromo.percent}%
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromo(null);
                        setPromoInput("");
                      }}
                      className="shrink-0 text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline"
                    >
                      {km ? "ដកចេញ" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="promo-code"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ""));
                        setPromoErr(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && void applyPromo()}
                      maxLength={20}
                      placeholder={km ? "ដាក់លេខកូដ" : "Enter code"}
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-lg border border-[#dfe8f6] bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider outline-none transition focus:border-[#2f5fe0] focus:ring-4 focus:ring-[#2f5fe0]/10"
                    />
                    <button
                      type="button"
                      onClick={() => void applyPromo()}
                      disabled={!selectedAmt || !promoInput.trim() || promoBusy}
                      className="shrink-0 rounded-lg bg-[#142650] px-4 text-sm font-bold text-white transition hover:bg-[#1f3570] disabled:opacity-40"
                    >
                      {promoBusy ? "…" : km ? "ប្រើ" : "Apply"}
                    </button>
                  </div>
                )}
                {promoErr && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-destructive">
                    <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                    {t(promoErr)}
                  </p>
                )}
                {!selectedAmt && !appliedPromo && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {km ? "ជ្រើសកញ្ចប់ជាមុនសិន" : "Choose a package first."}
                  </p>
                )}
              </div>

              {appliedPromo && selected?.price != null && (
                <div className="mt-3 flex items-center justify-between px-1 text-sm">
                  <span className="text-muted-foreground">{km ? "បញ្ចុះតម្លៃ" : "Discount"}</span>
                  <span className="font-semibold text-emerald-600">
                    -${appliedPromo.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#2f5fe0]/10 to-[#2f5fe0]/[0.03] px-3.5 py-3">
                <span className="text-sm font-semibold text-[#142650]">{t("Total")}</span>
                <span className="flex items-baseline gap-2">
                  {appliedPromo && selected?.price != null && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${selected.price.toFixed(2)}
                    </span>
                  )}
                  <span className="font-display text-2xl font-black text-[#2f5fe0] sm:text-3xl">
                    {finalPrice != null ? `$${finalPrice.toFixed(2)}` : "—"}
                  </span>
                </span>
              </div>

              {orderErr && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-destructive">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {t(orderErr)}
                </p>
              )}

              <button
                disabled={!canBuy}
                onClick={handleBuy}
                className={`mt-4 w-full rounded-xl py-3.5 font-display text-base font-bold transition sm:mt-5 sm:py-4 ${
                  canBuy || busy
                    ? "glow-pulse bg-gradient-to-r from-[#3b6cf0] to-[#1f42b8] text-white shadow-[0_10px_28px_rgb(47_95_224/0.4)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
                    : "cursor-not-allowed border border-[#dfe8f6] bg-[#eef3fb] text-[#8a9abb]"
                }`}
              >
                {busy ? (
                  t("Processing…")
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {canBuy ? <ShoppingCart className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    {t("Place Order")}
                    {canBuy && finalPrice != null && (
                      <span className="rounded-md bg-white/20 px-2 py-0.5 text-sm">
                        ${finalPrice.toFixed(2)}
                      </span>
                    )}
                  </span>
                )}
              </button>
              <p className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> {km ? "បង់ប្រាក់មានសុវត្ថិភាព" : "Secure payment"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {km ? "បញ្ចូល ១-៥ នាទី" : "Delivered in 1-5 min"}
                </span>
              </p>

              {!check?.ok && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <ArrowUp className="h-3.5 w-3.5" /> {t("Check your Player ID first to order")}
                </p>
              )}
            </aside>
          </>
        )}
      </main>
    </SiteChrome>
  );
}

// Shown instead of the order form while the owner has sales switched off.
function SalesPaused({ loading }: { loading: boolean }) {
  const { t } = useStorePrefs();
  if (loading) {
    return (
      <section className="card-3d mt-3 rounded-2xl p-6 text-center text-sm text-muted-foreground sm:mt-5 sm:rounded-3xl">
        {t("Loading…")}
      </section>
    );
  }
  return (
    <section className="card-3d mt-3 flex flex-col items-center rounded-2xl px-5 py-10 text-center sm:mt-5 sm:rounded-3xl sm:py-14">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Clock className="h-7 w-7" />
      </span>
      <h2 className="mt-4 font-khmer text-lg sm:text-xl">{t("Coming soon")}</h2>
      <p className="mt-2 max-w-md font-sans text-sm leading-[1.7] text-muted-foreground">
        {t("We are getting the packages ready. Please come back soon.")}
      </p>
      <a
        href={`https://t.me/${store.telegram.replace("@", "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 rounded-xl border border-border px-5 py-2.5 font-sans text-sm font-semibold transition-colors hover:bg-muted"
      >
        {t("Ask us on Telegram")} {store.telegram}
      </a>
    </section>
  );
}

// Guests have no order history, so the order's own link is how they come back to it.
function GuestLinkBox({
  path,
  copied,
  onCopied,
}: {
  path: string;
  copied: boolean;
  onCopied: () => void;
}) {
  const { t } = useStorePrefs();
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-sans text-sm font-bold text-primary">
        <Link2 className="h-4 w-4" />
        {t("Save your order link")}
      </p>
      <p className="mt-1 font-sans text-xs leading-[1.7] text-muted-foreground">
        {t("You ordered without an account. Open this link to see your order status later.")}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border bg-input px-3 py-2 font-mono text-xs outline-none"
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(onCopied, () => {});
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-sans text-xs font-semibold text-primary-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t("Copied") : t("Copy")}
        </button>
      </div>
    </div>
  );
}

// ABA badge: payments come through the shop's ABA PayWay link (KHQR, any bank app can pay).
function AbaMark() {
  return (
    <span className="flex h-12 w-20 shrink-0 sm:h-16 sm:w-24 flex-col items-center justify-center rounded-[3px] bg-[#0B4F71] text-white shadow-[0_3px_10px_rgb(11_79_113/0.35)]">
      <span className="text-xl font-extrabold leading-none tracking-wide">ABA</span>
      <span className="mt-1.5 text-[9px] font-bold leading-none tracking-[0.2em] text-white/80">KHQR</span>
    </span>
  );
}

const TG_USERNAME_KEY = "yuric-tg-username";

// One Telegram page with a Premium / Stars switch (each is its own game id underneath).
function TelegramSwitch({ current }: { current: string }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-[#dfe8f6] bg-[#eef3fb] p-1">
      {telegramTabs.map((tab) => {
        const on = tab.id === current;
        return (
          <Link
            key={tab.id}
            to="/game/$gameId"
            params={{ gameId: tab.id }}
            replace
            // Stay at the switch instead of jumping to the top of the page.
            resetScroll={false}
            aria-current={on ? "page" : undefined}
            className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-center text-sm font-bold transition sm:py-3 sm:text-base ${
              on
                ? "bg-gradient-to-r from-[#3b6cf0] to-[#1f42b8] text-white shadow-[0_6px_16px_rgb(47_95_224/0.35)]"
                : "text-[#5b6b8c] hover:bg-white/70 hover:text-[#142650]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// Telegram Stars / Premium go straight to the username typed above; nothing to redeem.
function TelegramSteps({ premium }: { premium: boolean }) {
  const { lang } = useStorePrefs();
  const km = lang === "km";
  const what = premium ? "Telegram Premium" : "Stars";
  const buy = km
    ? [
        "បញ្ចូល Telegram username របស់អ្នក (មើលក្នុង Telegram → Settings → Username)",
        premium ? "ជ្រើសរយៈពេល Premium (3, 6 ឬ 12 ខែ)" : "ជ្រើសចំនួន Stars ដែលចង់បាន",
        "បង់ប្រាក់តាម KHQR (ABA, ACLEDA, Wing ឬធនាគារណាមួយ)",
        `${what} ចូលគណនី Telegram នោះក្នុងរយៈពេលប៉ុន្មាននាទី`,
      ]
    : [
        "Enter your Telegram username (Telegram → Settings → Username).",
        premium ? "Pick how long you want Premium (3, 6 or 12 months)." : "Pick how many Stars you want.",
        "Pay with KHQR (ABA, ACLEDA, Wing or any bank app).",
        `${what} arrive on that Telegram account within a few minutes.`,
      ];
  const notes = km
    ? [
        "សូមពិនិត្យ username ឱ្យត្រូវ មុនពេលបង់ប្រាក់ ព្រោះផ្ញើហើយ មិនអាចដកវិញបានទេ",
        "គណនីត្រូវតែមាន username (មិនមែនតែលេខទូរស័ព្ទទេ)",
        ...(premium ? [] : ["Stars ប្រើទិញ gift, sticker និងមុខងារក្នុង Telegram"]),
      ]
    : [
        "Check the username before paying: once sent it can't be taken back.",
        "The account needs a username (a phone number alone is not enough).",
        ...(premium ? [] : ["Stars buy gifts, stickers and features inside Telegram."]),
      ];
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
          <Send className="h-4 w-4" /> {km ? "របៀបទិញ" : "How to buy"}
        </p>
        <ol className="list-decimal space-y-1 pl-5 font-sans text-sm leading-relaxed text-card-foreground">
          {buy.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
          <CircleAlert className="h-4 w-4" /> {km ? "ចំណាំ" : "Good to know"}
        </p>
        <ul className="list-disc space-y-1 pl-5 font-sans text-sm leading-relaxed text-card-foreground">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Robux are sold as gift card codes: the code shows after payment and the buyer redeems it.
function RobloxCodeSteps() {
  const { lang } = useStorePrefs();
  const km = lang === "km";
  const buy = km
    ? [
        "បញ្ចូល Roblox Username របស់អ្នក ហើយចុចពិនិត្យ ID",
        "ជ្រើសចំនួន Robux ដែលចង់បាន",
        "បង់ប្រាក់តាម KHQR (ABA, ACLEDA, Wing ឬធនាគារណាមួយ)",
        "លេខកូដ Roblox បង្ហាញភ្លាមៗលើទំព័រនេះ (និងក្នុង My Orders)",
      ]
    : [
        "Enter your Roblox username and tap Check ID.",
        "Pick how many Robux you want.",
        "Pay with KHQR (ABA, ACLEDA, Wing or any bank app).",
        "Your Roblox code shows on this page right away (and in My Orders).",
      ];
  const redeem = km
    ? [
        "ចុច Copy លេខកូដ",
        "បើក roblox.com/redeem ក្នុង browser (មិនមែនកម្មវិធី Roblox) ហើយ log in",
        "Paste លេខកូដ ហើយចុច Redeem · Robux ចូលភ្លាមៗ",
      ]
    : [
        "Copy the code.",
        "Open roblox.com/redeem in a browser (not the Roblox app) and sign in.",
        "Paste the code and tap Redeem. Robux arrive at once.",
      ];
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
          <Ticket className="h-4 w-4" /> {km ? "របៀបទិញ" : "How to buy"}
        </p>
        <ol className="list-decimal space-y-1 pl-5 font-sans text-sm leading-relaxed text-card-foreground">
          {buy.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
          <Ticket className="h-4 w-4" /> {km ? "របៀប Redeem លេខកូដ" : "How to redeem the code"}
        </p>
        <ol className="list-decimal space-y-1 pl-5 font-sans text-sm leading-relaxed text-card-foreground">
          {redeem.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          href="https://www.roblox.com/redeem"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
        >
          roblox.com/redeem ↗
        </a>
      </div>
    </div>
  );
}
