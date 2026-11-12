// Orders placed without signing in, remembered on this device so the buyer can
// open them again from the account menu. The token is what lets them see it.

export type SavedGuestOrder = {
  id: string;
  token: string;
  game: string;
  item: string;
  at: string;
};

const KEY = "yuric-guest-orders";
const MAX = 10;

export function guestOrderPath(id: string, token: string) {
  return `/order/${id}?t=${encodeURIComponent(token)}`;
}

export function listGuestOrders(): SavedGuestOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as SavedGuestOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveGuestOrder(order: SavedGuestOrder) {
  try {
    const rest = listGuestOrders().filter((o) => o.id !== order.id);
    localStorage.setItem(KEY, JSON.stringify([order, ...rest].slice(0, MAX)));
  } catch {
    // private mode: the link on screen still works
  }
}
