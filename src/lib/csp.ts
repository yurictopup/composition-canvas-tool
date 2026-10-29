// Content-Security-Policy pieces shared by src/server.ts and src/router.tsx.

/** Request header src/server.ts uses to hand this request's nonce to the page render. */
export const CSP_NONCE_HEADER = "x-csp-nonce";

/** 128 random bits, base64: a new one for every page. */
export function newCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The full policy. In production, scripts may come only from this site
 * (which includes Cloudflare's /cdn-cgi scripts) or be inline with this
 * page's nonce. The dev server's own inline scripts have no nonce, so dev
 * skips script-src.
 */
export function contentSecurityPolicy(nonce: string, production: boolean): string {
  return [
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    ...(production ? [`script-src 'self' 'nonce-${nonce}'`] : []),
    "upgrade-insecure-requests",
  ].join("; ");
}
