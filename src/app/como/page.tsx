import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import { cacheArtists } from "@/lib/server/cache";
import { fetchSpecialObjekts } from "@/lib/server/como";
import ComoCalendar from "@/components/como/calendar";
import CurrentMonth from "@/components/como/current-month";
import HelpDialog from "@/components/como/help-dialog";
import ArtistIcon from "@/components/artist-icon";

export const metadata: Metadata = {
  title: "COMO Calendar",
};

export default async function ComoPage() {
  const user = await decodeUser();

  const [artists, objekts] = await Promise.all([
    cacheArtists(),
    fetchSpecialObjekts(user!.address),
  ]);

  const totals = artists.map((artist) => {
    const total = objekts
      .filter(
        (t) => t.collection.contract === artist.contracts.Objekt.toLowerCase()
      )
      .reduce((sum, objekt) => {
        return sum + objekt.collection.comoAmount;
      }, 0);

    return { artist, total };
  });

  return (
    <main className="container flex flex-col gap-2 py-2">
      <div className="flex items-center">
        <div className="flex w-full gap-2 justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-cosmo uppercase">COMO</h1>
            <HelpDialog />
          </div>

          <div className="flex items-center gap-2">
            {totals.map((total) => (
              <div className="flex items-center gap-1" key={total.artist.name}>
                <ArtistIcon artist={total.artist.name} />
                <span className="font-semibold">+{total.total}</span>
              </div>
            ))}
          </div>

          <CurrentMonth />
        </div>
      </div>

      <ComoCalendar artists={artists} transfers={objekts} />
    </main>
  );
}
