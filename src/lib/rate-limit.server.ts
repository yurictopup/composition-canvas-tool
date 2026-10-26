import { getRequest } from "@tanstack/react-start/server";

/** The visitor's IP address as Vercel/Cloudflare report it, or "unknown". */
export function clientIp(): string {
  const headers = getRequest()?.headers;
  if (!headers) return "unknown";
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
