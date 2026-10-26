import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner-angkor.png";
import mascot from "@/assets/mascot-cut.png";
import { games } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const gameTabs = [
  { id: "all", label: "All", items: games },
  ...["mlbb", "ff", "roblox", "pubg"].map((id) => ({
    id,
    label: games.find((game) => game.id === id)?.name ?? id,
    items: games.filter((game) => game.id === id),
  })),
  {
    id: "other",
    label: "Others",
    items: games.filter((game) => !["mlbb", "ff", "roblox", "pubg"].includes(game.id)),
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      {
        name: "description",
        content:
          "បញ្ចូលពេជ្រ Mobile Legends, Free Fire, Roblox, PUBG UC — លឿន សុវត្ថិភាព តាម Bakong។",
      },
      { property: "og:title", content: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      {
        property: "og:description",
        content: "ជ្រើសហ្គេម បញ្ចូល ID រួចបង់ប្រាក់តាម Bakong — ពេជ្រចូលក្នុង 1-5 នាទី។",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: banner },
      { name: "twitter:image", content: banner },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteChrome>
      <section className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <Link
          to="/"
          hash="games"
          className="relative block aspect-[3/1] overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_center,#1e3a8a_0%,#0a1a3f_75%)] sm:aspect-[10/3]"
        >
          <img
            src={banner}
            alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត"
            width={1280}
            height={725}
            className="absolute inset-0 block h-full w-full object-cover object-[50%_22%]"
          />
          <span className="pointer-events-none absolute bottom-0 right-[5%] block h-[92%] w-auto">
            <span className="mascot-backdrop" aria-hidden="true" />
            <img
              src={mascot}
              alt="តួអង្គ Yuric ពេជ្រភ្លឺភ្លឹប"
              aria-hidden="true"
              className="relative block h-full w-auto object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.55)]"
            />
            <span
              className="mascot-shine absolute inset-0"
              style={{
                WebkitMaskImage: `url(${mascot})`,
                maskImage: `url(${mascot})`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
              }}
            />
          </span>
        </Link>
      </section>

      <section
        id="games"
        className="mx-auto w-full max-w-[1500px] scroll-mt-6 px-4 pt-5 pb-6 sm:px-6 sm:pt-6"
      >
        <Tabs defaultValue="all">
          <div className="overflow-x-auto pb-3">
            <TabsList
              aria-label="ជ្រើសរើសហ្គេម"
              className="h-auto w-max justify-start gap-2 bg-transparent p-0 sm:gap-2.5"
            >
              {gameTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="min-h-9 rounded-full border border-border/60 bg-secondary/60 px-4 py-1.5 text-sm font-semibold text-secondary-foreground backdrop-blur-sm transition-all hover:border-brand-400/50 hover:bg-card hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_2px_12px_oklch(0.55_0.18_264/0.4)]"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {gameTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-1 min-h-52 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-6"
            >
              <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6 sm:gap-x-5">
                {tab.items.map((g, i) => (
                  <Link
                    key={g.id}
                    to="/game/$gameId"
                    params={{ gameId: g.id }}
                    className="block text-center"
                    style={{ "--shine-delay": `${i * 0.5}s` } as CSSProperties}
                  >
                    <span className="tile-clean block rounded-[26%]">
                      <img
                        src={g.icon}
                        alt={g.name}
                        width={151}
                        height={151}
                        className="block aspect-square w-full object-cover"
                      />
                    </span>
                    <span className="mt-2 block truncate text-[11px] font-semibold">{g.name}</span>
                  </Link>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </SiteChrome>
  );
}
