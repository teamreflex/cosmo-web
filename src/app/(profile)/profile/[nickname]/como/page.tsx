import { Metadata } from "next";
import { fetchObjektsWithComo } from "@/lib/server/como";
import ComoCalendar from "@/components/como/calendar";
import CurrentMonth from "@/components/como/current-month";
import ArtistIcon from "@/components/artist-icon";
import { getArtistsWithMembers, getUserOrProfile } from "@/app/data-fetching";
import Portal from "@/components/portal";
import HelpDialog from "@/components/como/help-dialog";

type Props = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const user = await getUserOrProfile(params.nickname);

  return {
    title: `${user.username}'s COMO`,
  };
}

export default async function UserComoPage(props: Props) {
  const params = await props.params;
  const user = await getUserOrProfile(params.nickname);
  const objekts = user.cosmoAddress
    ? await fetchObjektsWithComo(user.cosmoAddress)
    : [];

  const artists = getArtistsWithMembers();
  const totals = artists.map((artist) => {
    const total = objekts
      .filter((t) => t.contract === artist.contracts.Objekt.toLowerCase())
      .reduce((sum, objekt) => {
        return sum + objekt.amount;
      }, 0);

    return { artist, total };
  });

  return (
    <main className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="flex w-full gap-2 justify-between items-center">
          <CurrentMonth />

          <div className="flex items-center gap-4">
            {totals.map((total) => (
              <div className="flex items-center gap-1" key={total.artist.name}>
                <ArtistIcon artist={total.artist.name} />
                <span className="font-semibold">
                  +{total.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ComoCalendar artists={artists} transfers={objekts} />

      <Portal to="#help">
        <HelpDialog />
      </Portal>
    </main>
  );
}
