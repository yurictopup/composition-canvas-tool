import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner.png.asset.json";
import { games } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      { name: "description", content: "បញ្ចូលពេជ្រ Mobile Legends, Free Fire, Roblox, PUBG UC — លឿន សុវត្ថិភាព តាម ABA KHQR។" },
      { property: "og:title", content: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      { property: "og:description", content: "ជ្រើសហ្គេម បញ្ចូល ID រួចបង់ប្រាក់តាម KHQR — ពេជ្រចូលក្នុង 1-3 នាទី។" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteChrome>
      <section className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden px-4 py-12 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1 text-xs text-brand-400">
            ⚡ ចូលភ្លាមៗ ក្នុង 1-3 នាទី
          </p>
          <h1 className="font-display text-4xl font-black leading-tight md:text-6xl">
            GAME <span className="text-brand-400 text-glow">TOP UP</span> <span className="text-on-dark text-glow">3D</span>
          </h1>
          <p className="mt-4 text-lg text-on-dark-muted">
            ជ្រើសហ្គេមមួយ បញ្ចូល ID របស់អ្នក រួចបង់ប្រាក់តាម KHQR — ពេជ្រចូលភ្លាមៗ។
          </p>
          <Link to="/" hash="games" className="btn-3d glow-pulse mt-8 inline-block rounded-xl px-8 py-4 font-display font-bold">
            ចាប់ផ្តើម
          </Link>
        </div>

        <div className="tile-clean rounded-3xl">
          <img src={banner.url} alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត" width={1920} height={1080}
            className="aspect-video w-full object-cover" />
        </div>
      </section>

      <section id="games" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card-3d rounded-3xl p-5 sm:p-7">
          <h2 className="font-display text-xl font-bold">ជ្រើសរើសហ្គេម</h2>
          <p className="mt-1 text-sm text-muted-foreground">ចុចហ្គេមមួយ ដើម្បីបញ្ចូល ID និងជ្រើសកញ្ចប់។</p>
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {games.map((g, i) => (
              <Link key={g.id} to="/game/$gameId" params={{ gameId: g.id }}
                className="block text-center" style={{ "--shine-delay": `${i * 0.5}s` } as CSSProperties}>
                <span className="tile-clean block rounded-[26%]">
                  <img src={g.icon} alt={g.name} width={151} height={151} className="aspect-square w-full object-cover" />
                </span>
                <span className="mt-2 block truncate text-[11px] font-semibold">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
