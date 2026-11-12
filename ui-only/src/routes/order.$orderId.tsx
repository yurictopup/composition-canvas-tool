import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { OrderPayment } from "@/components/OrderPayment";
import { store } from "@/lib/games";
import { getGuestOrder } from "@/lib/guest-order.functions";
import type { GuestOrderView } from "@/lib/guest-order.server";
import { useStorePrefs } from "@/lib/storePrefs";

// A guest order, opened by the secret link shown after ordering without an account.
export const Route = createFileRoute("/order/$orderId")({
  // A plain check instead of zod keeps zod out of the bundle every page loads.
  validateSearch: (search: Record<string, unknown>): { t?: string } =>
    typeof search["t"] === "string" ? { t: search["t"] } : {},
  head: () => ({
    meta: [{ title: "Order — Yuric Topup" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: GuestOrderPage,
});

function GuestOrderPage() {
  const { orderId } = Route.useParams();
  const { t: token } = Route.useSearch();
  const { t } = useStorePrefs();
  const [order, setOrder] = useState<GuestOrderView | null | undefined>(undefined);

  useEffect(() => {
    if (!token) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    getGuestOrder({ data: { orderId, token } })
      .then((o) => !cancelled && setOrder(o))
      .catch(() => !cancelled && setOrder(null));
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  const code = orderId.slice(0, 8).toUpperCase();
  const telegram = `https://t.me/${store.telegram.replace("@", "")}`;

  return (
    <SiteChrome>
      <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
        <div className="card-3d rounded-3xl p-6 sm:p-8">
          {order === undefined ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : order === null ? (
            <div className="py-10 text-center">
              <CircleAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h1 className="font-sans text-lg font-bold">{t("Order not found")}</h1>
              <p className="mt-1 font-sans text-sm leading-[1.7] text-muted-foreground">
                {t("This link is wrong or the order was removed.")}
              </p>
              <Link to="/" className="mt-4 inline-block font-semibold text-primary hover:underline">
                {t("Back to home")}
              </Link>
            </div>
          ) : order.status === "failed" || order.status === "refunded" ? (
            <div className="py-6 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("Order")} #{code}
              </p>
              <h1 className="mt-1 font-sans text-xl font-bold">
                {order.status === "refunded"
                  ? t("Refunded")
                  : t("Order failed. Contact us and we will help.")}
              </h1>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {order.gameName} · {order.packageAmt}
              </p>
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block font-semibold text-primary hover:underline"
              >
                Telegram {store.telegram}
              </a>
            </div>
          ) : (
            <>
              <OrderPayment
                orderId={order.id}
                guestToken={token}
                summary={{
                  code,
                  game: order.gameName,
                  item: order.packageAmt,
                  amount: order.price,
                }}
                fallback={
                  <div className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {t("Order")} #{code} · {order.gameName} {order.packageAmt} · $
                      {order.price.toFixed(2)}
                    </p>
                    <p className="mt-2">
                      {t("Contact us")}:{" "}
                      <a
                        href={telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary"
                      >
                        {store.telegram}
                      </a>
                    </p>
                  </div>
                }
              />
              <p className="mt-5 text-center font-sans text-xs text-muted-foreground">
                {t("Player")}: {order.playerId}
                {order.playerZone && ` (${order.playerZone})`}
              </p>
            </>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}
