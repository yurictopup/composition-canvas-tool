// Buying the package from GamesDrop once an order is paid. Server-side only.
// The order id is sent as GamesDrop's transactionId, so a retry of the same
// order can never buy it twice.
import { GamesDropError, gamesDropPost, gamesDropTarget } from "@/lib/player-lookup";

type Fetch = typeof fetch;

export type DeliveryOrder = {
  id: string;
  game_id: string;
  player_id: string;
  player_zone: string | null;
};

export type DeliveryResult = {
  status: "processing" | "completed" | "failed";
  supplierStatus: string;
  supplierOrderId?: string;
  message?: string;
  /** False when GamesDrop refused before buying, so the order can be retried. */
  notPlaced?: boolean;
};

// GamesDrop order statuses: SUBMITTED, PROCESSING, COMPLETED, CANCELED, FAILED, REFUND.
export function mapSupplierStatus(raw: unknown): DeliveryResult["status"] {
  if (raw === "COMPLETED") return "completed";
  if (raw === "CANCELED" || raw === "FAILED" || raw === "REFUND") return "failed";
  return "processing";
}

// Errors that mean GamesDrop did not take the order, so it is safe to say it failed.
const REJECTED = new Set([
  "INSUFFICIENT_BALANCE",
  "BALANCE_UNAVAILABLE",
  "OFFER_NOT_FOUND",
  "OUT_OF_STOCK",
  "WRONG_PRICE",
  "INVALID_REQUEST_BODY",
  "INVALID_TOKEN",
]);

export async function placeGamesDropOrder(
  order: DeliveryOrder,
  opts: { token: string; offerId: number; usesServerPicker: boolean; fetchImpl?: Fetch },
): Promise<DeliveryResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const target = await gamesDropTarget(
      {
        gameId: order.game_id,
        primary: order.player_id,
        secondary: order.player_zone ?? undefined,
      },
      {
        fetchImpl,
        token: opts.token,
        offerId: opts.offerId,
        usesServerPicker: opts.usesServerPicker,
      },
    );
    if (!target) {
      return {
        status: "failed",
        supplierStatus: "NO_SERVER",
        message: "GamesDrop does not offer this server.",
        notPlaced: true,
      };
    }

    // create-order must carry GamesDrop's current price, not ours.
    const offer = (await gamesDropPost(fetchImpl, opts.token, "/api/v1/offers/find-one", {
      offerId: opts.offerId,
    })) as { price?: unknown };
    if (typeof offer.price !== "number") {
      return {
        status: "failed",
        supplierStatus: "NO_PRICE",
        message: "GamesDrop returned no price for this offer.",
        notPlaced: true,
      };
    }

    const res = (await gamesDropPost(fetchImpl, opts.token, "/api/v1/offers/create-order", {
      offerId: opts.offerId,
      price: offer.price,
      transactionId: order.id,
      useBalance: true,
      customer: target,
    })) as { order_id?: unknown; status?: unknown };

    const supplierOrderId = res.order_id != null ? String(res.order_id) : undefined;
    const supplierStatus = typeof res.status === "string" ? res.status : "UNKNOWN";
    return {
      status: mapSupplierStatus(res.status),
      supplierStatus,
      ...(supplierOrderId ? { supplierOrderId } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[delivery]", message);
    if (error instanceof GamesDropError && error.code && REJECTED.has(error.code)) {
      return { status: "failed", supplierStatus: error.code, message, notPlaced: true };
    }
    // A timeout or unknown error may still have placed the order; keep it
    // processing so the owner checks before anything is bought again.
    return { status: "processing", supplierStatus: "UNCONFIRMED", message };
  }
}

export async function checkGamesDropOrder(
  supplierOrderId: string,
  opts: { token: string; fetchImpl?: Fetch },
): Promise<DeliveryResult> {
  try {
    const res = (await gamesDropPost(
      opts.fetchImpl ?? fetch,
      opts.token,
      "/api/v1/offers/order-status",
      {
        orderId: Number(supplierOrderId),
      },
    )) as { status?: unknown; message?: unknown };
    const supplierStatus = typeof res.status === "string" ? res.status : "UNKNOWN";
    return {
      status: mapSupplierStatus(res.status),
      supplierStatus,
      supplierOrderId,
      ...(typeof res.message === "string" ? { message: res.message } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "processing", supplierStatus: "UNCONFIRMED", supplierOrderId, message };
  }
}

export type CatalogOffer = {
  offerId: number;
  name: string;
  product: string;
  price: number | null;
  currency: string;
};

export async function searchGamesDropCatalog(
  search: string,
  opts: { token: string; fetchImpl?: Fetch },
): Promise<CatalogOffer[]> {
  const res = (await gamesDropPost(opts.fetchImpl ?? fetch, opts.token, "/api/v1/offers/sync", {
    search,
    limit: 100,
    page: 1,
  })) as { rows?: unknown };
  if (!Array.isArray(res.rows)) return [];
  type Row = {
    offerGroupId?: unknown;
    offerGroupName?: unknown;
    offerName?: unknown;
    productName?: unknown;
    price?: unknown;
    currency?: unknown;
  };
  return (res.rows as Row[]).flatMap((row) => {
    const offerId = Number(row.offerGroupId);
    if (!Number.isInteger(offerId) || offerId <= 0) return [];
    return [
      {
        offerId,
        name: String(row.offerGroupName ?? row.offerName ?? ""),
        product: String(row.productName ?? ""),
        price: typeof row.price === "number" ? row.price : null,
        currency: String(row.currency ?? ""),
      },
    ];
  });
}
