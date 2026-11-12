export type LookupResult =
  | { status: "found"; name: string }
  | { status: "not_found" }
  | { status: "unsupported" }
  | { status: "unavailable" };

export type LookupInput = { gameId: string; primary: string; secondary?: string | undefined };
