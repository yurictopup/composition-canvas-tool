import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner-angkor.png";
import { games, store } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Shop — Yuric Topup" },
      { name: "description", content: "Yuric Topup shop page — contact, payment methods, and all games." },
      { property: "og:title", content: "Shop — Yuric Topup" },
      { property: "og:description", content: "Yuric Topup shop page — contact and all games." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: banner },
      { name: "twitter:image", content: banner },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <SiteChrome>
      <section className="w-full">
        <div className="tile-clean">
          <img src={banner} alt="Shop banner" width={1920} height={1080}
            className="block h-[150px] w-full object-cover sm:h-[210px]" />
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6">
        <div className="card-3d relative -mt-12 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-end">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-card bg-secondary font-display text-3xl font-black text-secondary-foreground shadow-lg">
            YT
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-2xl font-black">{store.name}</h1>
            <p className="text-sm text-muted-foreground">
              Support {store.hours} · Telegram: {store.telegram}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ⚠️ Placeholder avatar (YT) — send a real photo to replace it.
            </p>
          </div>
        </div>

        <section className="card-3d mt-5 rounded-3xl p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold">All Games</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap a game to enter your ID and pick a package.</p>
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6 sm:gap-5">
            {games.map((g, i) => (
              <Link key={g.id} to="/game/$gameId" params={{ gameId: g.id }}
                className="block text-center" style={{ "--shine-delay": `${i * 0.5}s` } as CSSProperties}>
                <span className="tile-clean block rounded-[26%]">
                  <img src={g.icon} alt={g.name} width={151} height={151} className="block aspect-square w-full object-cover" />
                </span>
                <span className="mt-2 block truncate text-[11px] font-semibold">{g.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
