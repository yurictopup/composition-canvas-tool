import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner-angkor.png.asset.json";
import mascot from "@/assets/mascot-cut.png";
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
      { property: "og:image", content: banner.url },
      { name: "twitter:image", content: banner.url },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteChrome>
      <section className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <Link to="/" hash="games" className="relative block aspect-[3/1] overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_center,#1e3a8a_0%,#0a1a3f_75%)] sm:aspect-[10/3]">
          <img src={banner.url} alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត" width={1280} height={725}
            className="absolute inset-0 block h-full w-full object-cover object-[50%_22%]" />
          <span className="pointer-events-none absolute bottom-0 right-[5%] block h-[92%] w-auto">
            <span className="mascot-backdrop" aria-hidden="true" />
            <img src={mascot} alt="តួអង្គ Yuric ពេជ្រភ្លឺភ្លឹប" aria-hidden="true"
              className="relative block h-full w-auto object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.55)]" />
            <span className="mascot-shine absolute inset-0"
              style={{ WebkitMaskImage: `url(${mascot})`, maskImage: `url(${mascot})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
          </span>
        </Link>
      </section>

      <section id="games" className="mx-auto w-full max-w-[1500px] scroll-mt-6 px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
        <div className="card-3d rounded-3xl p-5 sm:p-7">
          <h2 className="text-center font-display text-xl font-bold tracking-wide">TOPUP</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">ជ្រើសរើសហ្គេម</p>
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
        </div>
      </section>

    </SiteChrome>
  );
}
