import { seedTables } from "@/mock/data";

export const DEMO_ADMIN = { email: "admin@demo.com", password: "demo1234" };
const DEMO_MESSAGE = "UI demo: only the demo admin account can sign in here.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type User = { id: string; email?: string; user_metadata: Record<string, any>; [key: string]: any };
type Session = { user: User };
type Row = Record<string, unknown>;
type Err = { message: string } | null;

const DB_KEY = "yt-demo-db";
const SESSION_KEY = "yt-demo-session";

function loadDb(): Record<string, Row[]> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return { ...seedTables(), ...(JSON.parse(raw) as Record<string, Row[]>) };
  } catch {
    return seedTables();
  }
  return seedTables();
}

let db: Record<string, Row[]> | null = null;
function tables() {
  if (!db) db = loadDb();
  return db;
}
function saveDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(tables()));
  } catch {
    return;
  }
}

const KEYS: Record<string, string[]> = {
  product_prices: ["game_id", "package_amt"],
  package_offers: ["game_id", "package_amt"],
  promo_codes: ["code"],
  site_images: ["slot"],
};
const keyOf = (table: string) => KEYS[table] ?? ["id"];

type Filter = (r: Row) => boolean;

function queryBuilder(table: string) {
  const filters: Filter[] = [];
  let mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  let payload: Row | Row[] | null = null;
  let single: "none" | "single" | "maybe" = "none";
  let order: { col: string; asc: boolean } | null = null;
  let limit: number | null = null;
  let range: [number, number] | null = null;
  let returning = false;

  const run = (): { data: unknown; error: Err; count?: number } => {
    const all = (tables()[table] ??= []);
    if (mode === "insert" || mode === "upsert") {
      const rows = (Array.isArray(payload) ? payload : [payload ?? {}]).map((r) => ({
        ...(table === "orders" ? { id: crypto.randomUUID(), created_at: new Date().toISOString() } : {}),
        ...(table === "promo_codes" ? { used_count: 0, created_at: new Date().toISOString() } : {}),
        ...r,
      }));
      for (const r of rows) {
        const keys = keyOf(table);
        const at = all.findIndex((x) => keys.every((k) => x[k] === r[k]));
        if (at >= 0 && mode === "upsert") all[at] = { ...all[at], ...r };
        else if (at >= 0) return { data: null, error: { message: "This item already exists." } };
        else all.push(r);
      }
      saveDb();
      return { data: returning ? (single !== "none" ? rows[0] : rows) : null, error: null };
    }
    let hit = all.filter((r) => filters.every((f) => f(r)));
    if (mode === "update") {
      hit.forEach((r) => Object.assign(r, payload));
      saveDb();
      return { data: returning ? hit : null, error: null };
    }
    if (mode === "delete") {
      tables()[table] = all.filter((r) => !hit.includes(r));
      saveDb();
      return { data: null, error: null };
    }
    if (order) {
      const { col, asc } = order;
      hit = [...hit].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
    }
    if (range) hit = hit.slice(range[0], range[1] + 1);
    if (limit != null) hit = hit.slice(0, limit);
    const data = hit.map((r) => ({ ...r }));
    if (single !== "none") return { data: data[0] ?? null, error: null };
    return { data, error: null, count: data.length };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    select: () => {
      if (mode !== "select") returning = true;
      return b;
    },
    insert: (r: Row | Row[]) => ((mode = "insert"), (payload = r), b),
    upsert: (r: Row | Row[]) => ((mode = "upsert"), (payload = r), b),
    update: (r: Row) => ((mode = "update"), (payload = r), b),
    delete: () => ((mode = "delete"), b),
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
    neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), b),
    in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
    gte: (c: string, v: unknown) => (filters.push((r) => String(r[c]) >= String(v)), b),
    lte: (c: string, v: unknown) => (filters.push((r) => String(r[c]) <= String(v)), b),
    is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
    not: () => b,
    or: () => b,
    match: (m: Row) => (filters.push((r) => Object.entries(m).every(([k, v]) => r[k] === v)), b),
    order: (col: string, o?: { ascending?: boolean }) => ((order = { col, asc: o?.ascending ?? true }), b),
    limit: (n: number) => ((limit = n), b),
    range: (a: number, z: number) => ((range = [a, z]), b),
    single: () => ((single = "single"), b),
    maybeSingle: () => ((single = "maybe"), b),
    then: (ok: (r: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, bad),
  };
  return b;
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

type AuthListener = (event: string, session: Session | null) => void;
const listeners = new Set<AuthListener>();
const emit = (event: string, s: Session | null) => listeners.forEach((l) => l(event, s));

const refused = async (..._args: unknown[]) => ({ data: { user: null, session: null }, error: { message: DEMO_MESSAGE } });

const auth = {
  getSession: async (): Promise<{ data: { session: Session | null }; error: null }> => ({
    data: { session: readSession() },
    error: null,
  }),
  getUser: async (): Promise<{ data: { user: User | null }; error: null }> => ({
    data: { user: readSession()?.user ?? null },
    error: null,
  }),
  getClaims: async () => ({ data: { claims: readSession() ? { aal: "aal2" } : null }, error: null }),
  onAuthStateChange: (cb: AuthListener) => {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => { listeners.delete(cb); } } } };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) return refused();
    const session: Session = {
      user: { id: "demo-admin", email: DEMO_ADMIN.email, user_metadata: { display_name: "Admin" } },
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      return refused();
    }
    emit("SIGNED_IN", session);
    return { data: { user: session.user, session }, error: null };
  },
  signOut: async () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      return { error: null };
    }
    emit("SIGNED_OUT", null);
    return { error: null };
  },
  signUp: refused,
  verifyOtp: refused,
  resend: refused,
  resetPasswordForEmail: refused,
  updateUser: refused,
  mfa: {
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null }),
    listFactors: async () => ({ data: { totp: [], all: [] }, error: null }),
    enroll: refused,
    unenroll: async (..._a: unknown[]) => ({ data: null, error: null }),
    challengeAndVerify: async (..._a: unknown[]) => ({ data: null, error: null }),
  },
};

const storage = {
  from: (_bucket: string) => {
    const urls = new Map<string, string>();
    return {
      upload: async (path: string, file: Blob, _opts?: unknown) => {
        urls.set(path, URL.createObjectURL(file));
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: urls.get(path) ?? "" } }),
      remove: async (..._a: unknown[]) => ({ data: null, error: null }),
    };
  },
};

export const backend = {
  auth,
  storage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string): any => queryBuilder(table),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: async (fn: string, _args?: unknown): Promise<{ data: any; error: Err }> => {
    if (fn === "is_owner" || fn === "is_owner_account") return { data: !!readSession(), error: null };
    return { data: null, error: { message: "UI demo" } };
  },
};

export function resetDemoData() {
  db = seedTables();
  saveDb();
}
