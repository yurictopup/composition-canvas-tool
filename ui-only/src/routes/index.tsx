import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import banner from "@/assets/banner-angkor.webp";
import { useSiteImage } from "@/lib/site-images";
import mascot from "@/assets/mascot-cut.webp";
import { games, listedGames, serverGames } from "@/lib/games";
import { gameImageUrls, warmImages } from "@/lib/image-preload";
import { SiteChrome } from "@/components/SiteChrome";
import { useStorePrefs } from "@/lib/storePrefs";
import { useStoreStatus } from "@/lib/store-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Inside a game's own tab the main tile names its server, next to the other servers' tiles.
const mainServerTile: Record<string, string> = { mlbb: "Mobile Legends KH", ff: "Free Fire MY/SG" };

const gameTabs = [
  { id: "all", label: "All", items: listedGames },
  ...["mlbb", "ff", "roblox", "pubg"].map((id) => ({
    id,
    label: games.find((game) => game.id === id)?.name ?? id,
    // Each server of the game (e.g. Free Fire SG, PH) gets its own tile.
    items: [
      ...games.filter((game) => game.id === id),
      ...serverGames.filter((game) => game.base === id),
    ],
  })),
  {
    id: "other",
    label: "Others",
    items: listedGames.filter((game) => !["mlbb", "ff", "roblox", "pubg"].includes(game.id)),
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      {
        name: "description",
        content:
          "បញ្ចូលពេជ្រ Mobile Legends, Free Fire, Roblox, PUBG UC — លឿន សុវត្ថិភាព តាម Bakong",
      },
      { property: "og:title", content: "Yuric Topup — បញ្ចូលពេជ្រហ្គេម 3D" },
      {
        property: "og:description",
        content: "ជ្រើសហ្គេម បញ្ចូល ID រួចបង់ប្រាក់តាម Bakong — ពេជ្រចូលក្នុង 1-5 នាទី",
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
  const pic = useSiteImage();
  const status = useStoreStatus();
  return (
    <SiteChrome>
      <section className="mx-auto w-full max-w-[1500px] px-3 pt-3 sm:px-6 sm:pt-4">
        <Link
          to="/"
          hash="games"
          className="relative block aspect-[3/1] overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_center,#1e3a8a_0%,#0a1a3f_75%)] sm:aspect-[10/3] lg:aspect-[4/1]"
        >
          <img
            src={pic(banner)}
            alt="រូបបដាហ្គេម ពេជ្រភ្លឺភ្លឹបភ្ល្លែត"
            fetchPriority="high"
            width={1280}
            height={725}
            className="absolute inset-0 block h-full w-full object-cover object-[50%_22%]"
          />
          <BannerOverlay />
          <span className="pointer-events-none absolute bottom-0 right-[5%] z-[2] block h-[92%] w-auto">
            <span className="mascot-backdrop" aria-hidden="true" />
            <HairWindFilter />
            {/* Hair layer: the whole image with a wind ripple; the face and body
                are covered by the still copy below, so only the hair moves. */}
            <img
              src={mascot}
              alt="តួអង្គ Yuric ពេជ្រភ្លឺភ្លឹប"
              aria-hidden="true"
              className="mascot-hair relative block h-full w-auto object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.55)]"
            />
            <img
              src={mascot}
              alt=""
              aria-hidden="true"
              className="mascot-still absolute inset-0 block h-full w-auto object-contain"
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

      {status && !status.salesOpen && (
        <section className="mx-auto w-full max-w-[1500px] px-3 pt-3 sm:px-6 sm:pt-4">
          <p className="card-3d flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-center font-sans text-sm font-semibold leading-[1.7]">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            {t("Store is getting ready. Packages open soon.")}
          </p>
        </section>
      )}

      <section
        id="games"
        className="mx-auto w-full max-w-[1500px] scroll-mt-6 px-3 pt-4 pb-6 sm:px-6 sm:pt-6"
      >
        <Tabs defaultValue="all">
          <div className="overflow-x-auto pb-2 sm:pb-3">
            <TabsList
              aria-label="ជ្រើសរើសហ្គេម"
              className="h-auto w-max justify-start gap-1.5 bg-transparent p-0 sm:gap-2.5"
            >
              {gameTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="min-h-8 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-xs font-semibold sm:min-h-9 sm:px-4 sm:py-1.5 sm:text-sm text-secondary-foreground backdrop-blur-sm transition-all hover:border-brand-400/50 hover:bg-card hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_2px_12px_oklch(0.55_0.18_264/0.4)]"
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
              className="mt-1 min-h-52 rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-6"
            >
              <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 sm:gap-y-6 sm:gap-x-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10">
                {tab.items.map((g, i) => (
                  <Link
                    key={g.id}
                    to="/game/$gameId"
                    params={{ gameId: g.id }}
                    className="block text-center"
                    style={{ "--shine-delay": `${i * 0.5}s` } as CSSProperties}
                    // Fetch this game's pictures before the click so its page opens complete.
                    onPointerEnter={() => warmImages(gameImageUrls(g.id))}
                    onTouchStart={() => warmImages(gameImageUrls(g.id))}
                  >
                    <span className="tile-clean block rounded-[26%]">
                      <img
                        src={pic(g.icon)}
                        // The first rows load at once; only the far ones wait for scrolling.
                        loading={i < 14 ? "eager" : "lazy"}
                        decoding="async"
                        alt={g.name}
                        width={151}
                        height={151}
                        className="block aspect-square w-full object-cover"
                      />
                    </span>
                    <span className="mt-1.5 block truncate text-[10px] font-semibold sm:mt-2 sm:text-[11px]">
                      {(tab.id === g.id && mainServerTile[g.id]) || g.name}
                    </span>
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

// Icon spots along the white swoosh, in % of the swoosh box.
const iconSpots = [
  { top: 4, left: 16, rotate: -8 },
  { top: 26, left: 28, rotate: 6 },
  { top: 48, left: 34, rotate: -5 },
  { top: 70, left: 42, rotate: 8 },
];

const gems: { left: string; top: string; size: string; delay: string; mobile?: boolean }[] = [
  { left: "24%", top: "70%", size: "clamp(22px,3.2vw,48px)", delay: "0s" },
  { left: "33%", top: "14%", size: "clamp(14px,1.8vw,28px)", delay: "1.4s" },
  { left: "69%", top: "10%", size: "clamp(16px,2.2vw,34px)", delay: "0.7s", mobile: true },
  { left: "67%", top: "52%", size: "clamp(18px,2.6vw,40px)", delay: "1.9s", mobile: true },
  { left: "93%", top: "66%", size: "clamp(20px,2.8vw,44px)", delay: "1s" },
];

function Diamond({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 56" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="gem-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0fbff" />
          <stop offset="0.45" stopColor="#5fd4ff" />
          <stop offset="1" stopColor="#1e5bff" />
        </linearGradient>
      </defs>
      <path d="M14 2h36l14 16-32 36L0 18z" fill="url(#gem-a)" />
      <path
        d="M0 18h64M14 2l8 16 10-16 10 16 8-16M22 18l10 36 10-36"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// Welcome headline, payment badge, game icons, waves and gems drawn over the
// Angkor banner (HTML/SVG, so it stays sharp and follows the store language).
function BannerOverlay() {
  const pic = useSiteImage();
  return (
    <span className="pointer-events-none absolute inset-0 z-[1] block">
      <span className="absolute inset-0 block bg-[radial-gradient(ellipse_42%_75%_at_50%_48%,rgb(6_20_70/0.6),transparent_72%)]" />

      {/* gold wave along the bottom */}
      <svg
        viewBox="0 0 1000 250"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wave-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff9a00" />
            <stop offset="0.5" stopColor="#ffd34d" />
            <stop offset="1" stopColor="#ff9a00" />
          </linearGradient>
        </defs>
        <path
          d="M0 250V222C210 186 460 244 700 210C820 193 920 196 1000 186V250Z"
          fill="url(#wave-gold)"
        />
        <path
          d="M0 222C210 186 460 244 700 210C820 193 920 196 1000 186"
          fill="none"
          stroke="#fff6c9"
          strokeWidth="3"
        />
      </svg>

      {/* white swoosh with 3D game tiles */}
      <span className="absolute inset-y-0 left-0 block w-[19%]">
        <svg
          viewBox="0 0 200 250"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M0 0H118C84 64 92 164 168 250H0Z" fill="#ffffff" fillOpacity="0.94" />
          <path d="M118 0C84 64 92 164 168 250" fill="none" stroke="#7cc4ff" strokeWidth="4" />
        </svg>
        {floatIcons.map((g, i) => (
          <img
            key={g.id}
            src={pic(g.icon)}
            alt=""
            className="banner-float absolute block aspect-square w-[30%] rounded-[24%] object-cover ring-2 ring-white shadow-[0_3px_0_#b9c9e6,0_6px_12px_rgb(10_30_80/0.35)] sm:ring-[3px] sm:shadow-[0_5px_0_#b9c9e6,0_10px_18px_rgb(10_30_80/0.35)]"
            style={{
              top: `${iconSpots[i]!.top}%`,
              left: `${iconSpots[i]!.left}%`,
              rotate: `${iconSpots[i]!.rotate}deg`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
      </span>

      {/* headline */}
      <span className="absolute left-[47%] top-[46%] flex w-[56%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:left-[50%] sm:w-[48%]">
        <span className="grid font-khmer text-[clamp(28px,6.2vw,96px)] leading-[1.1]">
          <span className="banner-title-back col-start-1 row-start-1" aria-hidden="true">
            សូមស្វាគមន៍
          </span>
          <span className="banner-title col-start-1 row-start-1">សូមស្វាគមន៍</span>
        </span>
        <span className="-mt-[0.15em] grid self-end pr-[14%] font-khmer text-[clamp(12px,2vw,30px)]">
          <span className="banner-title-back col-start-1 row-start-1" aria-hidden="true">
            មកកាន់
          </span>
          <span className="banner-title col-start-1 row-start-1">មកកាន់</span>
        </span>
        <span className="mt-[0.15em] rounded-md border-2 border-[#fff2b0] bg-gradient-to-b from-[#ffd75e] to-[#ff9d00] px-[0.9em] py-[0.12em] font-display text-[clamp(11px,2.3vw,34px)] font-black tracking-[0.14em] text-[#0b2a7a] shadow-[0_4px_0_#b86e00,0_10px_20px_rgb(0_0_0/0.4)]">
          YURIC TOPUP
        </span>
        <span className="banner-sub mt-[0.55em] font-khmer text-[clamp(10px,1.7vw,26px)]">
          បញ្ចូលពេជ្របានភ្លាមៗ - ដោយសុវត្ថិភាព
        </span>
      </span>

      {gems.map((g, i) => (
        <Diamond
          key={i}
          className={`banner-float absolute drop-shadow-[0_0_12px_rgb(103_232_249/0.85)] ${g.mobile ? "" : "hidden sm:block"}`}
          style={{
            left: g.left,
            top: g.top,
            width: g.size,
            height: g.size,
            animationDelay: g.delay,
          }}
        />
      ))}
    </span>
  );
}

// Scrolling noise pushed through a displacement map reads as wind in the hair.
function HairWindFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="hair-wind" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018 0.045"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feOffset in="noise" dx="0" dy="0" result="flow">
          <animate
            attributeName="dx"
            values="0;36;0"
            dur="3.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          />
          <animate
            attributeName="dy"
            values="0;-10;0"
            dur="3.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          />
        </feOffset>
        <feDisplacementMap
          in="SourceGraphic"
          in2="flow"
          scale="9"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
