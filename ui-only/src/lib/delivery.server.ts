export type DeliveryResponse = { ok: boolean; message: string; status?: string };

export type SupplierAccount = {
  balance: number;
  currency: string;
  plan: string | null;
  planExpiresAt: string | null;
  subscriptionActive: boolean;
};

export type SupplierStock =
  | ({ ok: true } & SupplierAccount)
  | { ok: false; reason: "no_key" | "error"; message?: string };

export type SupplierOrder = {
  id: string;
  status: string;
  game: string;
  product: string;
  cost: number;
  createdAt: string;
  image: string | null;
};

export type SupplierOrders =
  | { ok: true; orders: SupplierOrder[] }
  | { ok: false; reason: "no_key" | "error"; message?: string };
