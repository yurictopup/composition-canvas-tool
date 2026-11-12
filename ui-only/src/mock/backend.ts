
const DEMO_MESSAGE = "UI demo: accounts are turned off in this copy.";

type Result = { data: unknown; error: { message: string } | null; count?: number | null };

function tableResult(table: string, single: boolean): Result {
  switch (table) {
    case "store_settings":
      return { data: { sales_open: true, hidden_games: [] }, error: null };
    case "product_prices":
    case "site_images":
    case "package_offers":
      return { data: null, error: { message: "UI demo: no database" } };
    default:
      return { data: single ? null : [], error: null, count: 0 };
  }
}

function queryBuilder(table: string) {
  let single = false;
  const builder: Record<string, unknown> = {};
  const chain = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        const result = tableResult(table, single);
        return (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      return (..._args: unknown[]) => {
        if (prop === "single" || prop === "maybeSingle") single = true;
        return chain;
      };
    },
  });
  return chain;
}

type Session = { user: User };
type AuthListener = (event: string, session: Session | null) => void;
const listeners = new Set<AuthListener>();

const auth = {
  getSession: async (): Promise<{ data: { session: Session | null }; error: null }> => ({
    data: { session: null },
    error: null,
  }),
  getUser: async (): Promise<{ data: { user: User | null }; error: null }> => ({
    data: { user: null },
    error: null,
  }),
  onAuthStateChange: (cb: AuthListener) => {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => { listeners.delete(cb); } } } };
  },
  signOut: async () => ({ error: null }),
  signInWithPassword: async (_input: unknown) => ({ data: { user: null, session: null }, error: { message: DEMO_MESSAGE } }),
  signUp: async (_input: unknown) => ({ data: { user: null, session: null }, error: { message: DEMO_MESSAGE } }),
  verifyOtp: async (_input: unknown) => ({ data: { user: null, session: null }, error: { message: DEMO_MESSAGE } }),
  resend: async (_input: unknown) => ({ data: null, error: { message: DEMO_MESSAGE } }),
  resetPasswordForEmail: async (_email: string, _opts?: unknown) => ({ data: null, error: { message: DEMO_MESSAGE } }),
  updateUser: async (_input: unknown) => ({ data: { user: null }, error: { message: DEMO_MESSAGE } }),
};

export const backend = {
  auth,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string): any => queryBuilder(table),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: async (_fn: string, _args?: unknown): Promise<{ data: any; error: { message: string } | null }> => ({ data: null, error: { message: "UI demo: no database" } }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type User = { id: string; email?: string; user_metadata: Record<string, any>; [key: string]: any };
