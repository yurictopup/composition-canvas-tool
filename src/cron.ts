// Nitro plugin: the Cloudflare cron (triggers in vite.config.ts) runs the order
// sweep, so paid orders are delivered even after the customer closed the page.
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    // Secrets live on env; the shop's code reads them from process.env.
    for (const [key, value] of Object.entries((env ?? {}) as Record<string, unknown>)) {
      if (typeof value === "string" && process.env[key] === undefined) process.env[key] = value;
    }
    const { sweepOrders } = await import("@/lib/order-sweep.server");
    const report = await sweepOrders();
    if (report.checked || report.retried || report.refreshed) console.log("[sweep]", report);
  });
});
