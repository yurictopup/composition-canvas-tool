import "./lib/error-capture";

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
// no MIME sniffing, HTTPS only, forms post only to us, no other tab can reach
// this window, and no camera/mic/location access.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

// Pages search engines should never list (the admin and sign-in screens).
const PRIVATE_PATHS = /^\/(admin|auth|profile)(\/|$)/;

function withSecurityHeaders(response: Response, request?: Request): Response {
  const secured = new Response(response.body, response);
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
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Bindings (Workers AI) for server functions, in case the host didn't share them already.
      const g = globalThis as { __env__?: unknown };
      if (!g.__env__ && env && typeof env === "object") g.__env__ = env;
      // Yuric Bot health check: says whether Workers AI is connected and which model answers.
      if (new URL(request.url).pathname === "/api/bot-status") {
        const { botStatus } = await import("./lib/bot-status.server");
        return withSecurityHeaders(await botStatus(request, env));
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
