// UI-only copy: just the result type. The real name check (FazerCards,
// GamesDrop) runs on the server in the live store and is not included here.
export type LookupResult =
  | { status: "found"; name: string }
  | { status: "not_found" }
  | { status: "unsupported" }
  | { status: "unavailable" };

export type LookupInput = { gameId: string; primary: string; secondary?: string | undefined };
