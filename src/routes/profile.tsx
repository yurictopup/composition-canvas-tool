import { createFileRoute, Link } from "@tanstack/react-router";
import banner from "@/assets/banner.png.asset.json";
import { games, store } from "@/lib/games";
import { SiteChrome } from "@/components/SiteChrome";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "ប្រវត្តិ — Yuric Topup" },
      { name: "description", content: "ទំព័រប្រវត្តិរបស់ Yuric Topup — ទំនាក់ទំនង វិធីបង់ប្រាក់ និងហ្គេមទាំងអស់។" },
      { property: "og:title", content: "ប្រវត្តិ — Yuric Topup" },
      { property: "og:description", content: "ទំព័រប្រវត្តិរបស់ Yuric Topup — ទំនាក់ទំនង និងហ្គេមទាំងអស់។" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <SiteChrome>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="card-3d overflow-hidden rounded-3xl">
          <div className="tile-clean">
            <img src={banner.url} alt="រូបបដារបស់ហាង" width={1920} height={1080}
              className="aspect-[3/1] w-full object-cover" />
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
            <span className="-mt-14 grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-card bg-secondary font-display text-3xl font-black text-secondary-foreground shadow-lg">
              YT
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-black">{store.name}</h1>
              <p className="text-sm text-muted-foreground">
                ជំនួយ {store.hours} · Telegram: {store.telegram}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          ⚠️ រូបតំណាង (GZ) នៅសល់ជាកន្លែងទំនេរ — សូមផ្ញើរូបតំណាងពិត ដើម្បីដាក់ជារូបរបស់អ្នក។
        </p>

        <section className="card-3d mt-5 rounded-3xl p-5">
          <h2 className="font-display text-lg font-bold">ហ្គេមទាំងអស់</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {games.map((g) => (
              <Link key={g.id} to="/game/$gameId" params={{ gameId: g.id }}
                className="chip-3d px-4 py-2 text-xs font-bold uppercase">{g.name}</Link>
            ))}
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
