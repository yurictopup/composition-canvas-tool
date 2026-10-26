import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import banner from "@/assets/banner-angkor.png";
import mascot from "@/assets/mascot-cut.png";
import { Gem } from "lucide-react";
import { games } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";
import { useStorePrefs } from "@/lib/storePrefs";
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
  const { t } = useStorePrefs();
  return (
    <SiteChrome>
      <section className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6">
        <Link
          to="/"
          hash="games"
          className="relative block aspect-[3/1] overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_center,#1e3a8a_0%,#0a1a3f_75%)] sm:aspect-[10/3] lg:aspect-[4/1]"
        >
          <img
            src={banner}
            alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត"
            width={1280}
            height={725}
            className="absolute inset-0 block h-full w-full object-cover object-[50%_22%]"
          />
          <BannerOverlay />
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
                  {t(tab.label)}
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
              <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6 sm:gap-x-5 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
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

const floatIcons = ["mlbb", "genshin", "pubg", "ff"]
  .map((id) => games.find((g) => g.id === id))
  .filter((g): g is (typeof games)[number] => Boolean(g));

const gems: { left: string; top: string; size: string; delay: string }[] = [
  { left: "30%", top: "68%", size: "clamp(14px,2vw,30px)", delay: "0s" },
  { left: "71%", top: "8%", size: "clamp(12px,1.6vw,24px)", delay: "1.2s" },
  { left: "44%", top: "78%", size: "clamp(16px,2.4vw,36px)", delay: "0.6s" },
  { left: "63%", top: "70%", size: "clamp(12px,1.8vw,26px)", delay: "1.8s" },
  { left: "95%", top: "12%", size: "clamp(12px,1.6vw,24px)", delay: "0.9s" },
];

// Welcome headline, payment badge, floating game icons and gems drawn over
// the Angkor banner (all HTML/CSS, so it stays sharp and translatable).
function BannerOverlay() {
  const { t } = useStorePrefs();
  return (
    <span className="pointer-events-none absolute inset-0 z-[1] block">
      {/* soft shade so the headline reads over the temple */}
      <span className="absolute inset-0 block bg-[radial-gradient(ellipse_45%_70%_at_50%_50%,rgb(6_20_60/0.55),transparent_70%)]" />

      {/* curved white swoosh with game icons */}
      <span className="absolute -left-[6%] top-0 hidden h-full w-[24%] sm:block">
        <span className="absolute inset-y-[-20%] right-0 block w-[70%] rounded-[50%] border-r-[10px] border-white/85 shadow-[8px_0_30px_rgb(255_255_255/0.35)]" />
        {floatIcons.map((g, i) => (
          <img
            key={g.id}
            src={g.icon}
            alt=""
            className="banner-float absolute block aspect-square w-[22%] rounded-[24%] object-cover shadow-[0_6px_16px_rgb(0_0_0/0.35)] ring-2 ring-white"
            style={{
              top: `${7 + i * 23}%`,
              left: `${[52, 60, 62, 56][i]}%`,
              rotate: `${[-10, 6, -6, 10][i]}deg`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </span>

      {/* "Pay with" card */}
      <span className="absolute left-[17%] top-[9%] hidden items-center gap-3 rounded-xl bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgb(0_0_0/0.25)] md:flex">
        <span className="text-[clamp(10px,0.9vw,13px)] font-bold text-[#142650]">{t("Pay with")}</span>
        <span className="rounded-[3px] bg-[#E1232E] px-2.5 py-1 text-[clamp(11px,1vw,15px)] font-extrabold tracking-wide text-white">
          KHQR
        </span>
      </span>

      {/* headline */}
      <span className="absolute left-[38%] top-1/2 flex w-[66%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:left-[48%] sm:w-[52%]">
        <span className="banner-title font-khmer text-[clamp(30px,5.4vw,80px)] leading-[1.15]">{t("Welcome")}</span>
        <span className="-mt-[0.3em] self-end pr-[22%] font-khmer text-[clamp(13px,1.6vw,24px)] text-white [text-shadow:0_2px_6px_rgb(0_0_0/0.5)]">
          {t("to")}
        </span>
        <span className="mt-[0.2em] rounded-sm bg-gradient-to-r from-[#ffb21e] via-[#ffd75e] to-[#ffb21e] px-[0.8em] py-[0.15em] font-display text-[clamp(13px,2vw,30px)] font-black tracking-[0.12em] text-[#0b2a7a] shadow-[0_4px_0_#b86e00,0_8px_18px_rgb(0_0_0/0.35)]">
          YURIC TOPUP
        </span>
        <span className="mt-[0.6em] font-khmer text-[clamp(12px,1.5vw,22px)] text-white [text-shadow:0_2px_8px_rgb(0_0_0/0.6)]">
          {t("Instant top-up - safe and secure")}
        </span>
      </span>

      {gems.map((g, i) => (
        <Gem
          key={i}
          className="banner-float absolute text-cyan-300 drop-shadow-[0_0_10px_rgb(103_232_249/0.9)]"
          style={{ left: g.left, top: g.top, width: g.size, height: g.size, animationDelay: g.delay }}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}
