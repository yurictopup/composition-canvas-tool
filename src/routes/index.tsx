import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner-angkor.png.asset.json";
import mascot from "@/assets/mascot-cut.png";
import { games, payments } from "@/lib/games";
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

const steps = [
  { title: "ជ្រើសហ្គេម", body: "ចុចហ្គេមមួយ ដើម្បីបើកទំព័របញ្ចូលរបស់ហ្គេមនន។" },
  { title: "បញ្ចូល ID", body: "បញ្ចូល User ID (និង Zone ID បើមាន) រួចចុច Check ID។" },
  { title: "បង់ប្រាក់", body: "បង់តាម KHQR រួចរង់ចាំពេជ្រចូល 1-3 នាទី។" },
];

function Index() {
  return (
    <SiteChrome>
      <section className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <Link to="/" hash="games" className="relative block overflow-hidden rounded-lg">
          <img src={banner.url} alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត" width={1280} height={725}
            className="block aspect-[3/1] w-full object-cover sm:aspect-[10/3]" />
          <span className="pointer-events-none absolute bottom-0 right-[3%] block h-[88%] w-auto">
            <img src={mascot} alt="តួអង្គ Yuric ពេជ្រភ្លឺភ្លឹប" aria-hidden="true"
              className="block h-full w-auto object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.55)]" />
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

      <section className="mx-auto w-full max-w-[1500px] px-4 pb-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card-3d rounded-3xl p-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-3 font-display font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6">
        <div className="card-3d flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
          <div>
            <h3 className="font-display font-bold">វិធីបង់ប្រាក់</h3>
            <p className="text-sm text-muted-foreground">ជ្រើសបាន 1 ក្នុង 4 វិធី</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {payments.map((m) => (
              <span key={m} className="chip-3d px-4 py-2 text-xs font-bold">{m}</span>
            ))}
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
