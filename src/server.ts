import "./lib/error-capture";

import { CSP_NONCE_HEADER, contentSecurityPolicy, newCspNonce } from "./lib/csp";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Browser protections for every page: no framing by other sites (clickjacking),
// only our own scripts (see lib/csp.ts), no MIME sniffing, HTTPS only, forms
// post only to us, no other tab can reach this window, and no
// camera/mic/location access.
const SECURITY_HEADERS: Record<string, string> = {
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

// Pages search engines should never list (the admin and sign-in screens).
const PRIVATE_PATHS = /^\/(admin|auth|profile|nbc-test)(\/|$)/;

function withSecurityHeaders(response: Response, nonce: string, request?: Request): Response {
  const secured = new Response(response.body, response);
  if (!secured.headers.has("content-security-policy")) {
    secured.headers.set(
      "content-security-policy",
      contentSecurityPolicy(nonce, !import.meta.env.DEV),
    );
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!secured.headers.has(name)) secured.headers.set(name, value);
  }
  if (request && PRIVATE_PATHS.test(new URL(request.url).pathname)) {
    secured.headers.set("x-robots-tag", "noindex, nofollow");
    secured.headers.set("cache-control", "no-store");
  }
  return secured;
}

export default {
  async fetch(incoming: Request, env: unknown, ctx: unknown) {
    // A new nonce per request, handed to the page render (src/router.tsx).
    // Any nonce header the visitor sent is replaced.
    const nonce = newCspNonce();
    const headers = new Headers(incoming.headers);
    headers.set(CSP_NONCE_HEADER, nonce);
    // Built from its parts: in `vite dev` on Node, `incoming` is another fetch
    // library's Request, which `new Request(incoming)` can't copy.
    const request = new Request(incoming.url, {
      method: incoming.method,
      headers,
      body: incoming.body,
      // @ts-expect-error Node needs `duplex` for streamed bodies; Workers ignore it.
      duplex: "half",
    });
    try {
      // Bindings (Workers AI) for server functions, in case the host didn't share them already.
      const g = globalThis as { __env__?: unknown };
      if (!g.__env__ && env && typeof env === "object") g.__env__ = env;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), nonce, request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    }
  },
};
