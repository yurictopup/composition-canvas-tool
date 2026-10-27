// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    cloudflare: {
      // Cloudflare Workers Builds runs `wrangler preview` for non-main branches,
      // which requires a `previews` block in the generated wrangler.json.
      // The store is served only on store.yurictopup.com (custom domain set in the
      // dashboard), so the public workers.dev address stays off on every deploy;
      // `preview_urls` keeps PR preview links working anyway.
      // `ai` binds Workers AI (free daily quota) for Yuric Bot, see src/lib/chat.functions.ts.
      // @ts-expect-error nitro reads `wrangler` at build time, but its types don't list it yet.
      wrangler: { previews: {}, workers_dev: false, preview_urls: true, ai: { binding: "AI" } },
    },
  },
});
