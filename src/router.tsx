import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { CSP_NONCE_HEADER } from "./lib/csp";
import { routeTree } from "./routeTree.gen";

// The page's own inline scripts carry this request's nonce (set in src/server.ts),
// so the Content-Security-Policy can refuse every other inline script.
const cspNonce = createIsomorphicFn()
  .server(() => getRequest()?.headers.get(CSP_NONCE_HEADER) ?? undefined)
  .client(() => undefined);

export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = cspNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
