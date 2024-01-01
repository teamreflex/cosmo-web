import StatsRenderer from "@/components/objekt-stats/stats-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Objekt Stats",
};

export default async function ObjektsStatsPage() {
  const [artists, collections] = await Promise.all([
    fetchArtistsWithMembers(),
    fetchUniqueCollections(),
  ]);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex gap-2 items-center w-full pb-1">
        <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
          Objekt Stats
        </h1>
      </div>

      <StatsRenderer artists={artists} collections={collections} />
    </main>
  );
}
