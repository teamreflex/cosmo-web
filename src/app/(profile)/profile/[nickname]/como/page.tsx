import { Metadata } from "next";
import { fetchObjektsWithComo } from "@/lib/server/como";
import ComoCalendar from "@/components/como/calendar";
import CurrentMonth from "@/components/como/current-month";
import ArtistIcon from "@/components/artist-icon";
import {
  decodeUser,
  getArtistsWithMembers,
  getUserByIdentifier,
} from "@/app/data-fetching";
import Portal from "@/components/portal";
import HelpDialog from "@/components/como/help-dialog";
import { Shield } from "lucide-react";
import { isAddressEqual } from "@/lib/utils";

type Props = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s COMO`,
  };
}

export default async function UserComoPage(props: Props) {
  const params = await props.params;
  const user = await decodeUser();
  const { profile } = await getUserByIdentifier(params.nickname);
  if (profile.privacy.como && !isAddressEqual(user?.address, profile.address)) {
    return <Private nickname={profile.nickname} />;
  }

  const [artists, objekts] = await Promise.all([
    getArtistsWithMembers(),
    fetchObjektsWithComo(profile.address),
  ]);

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
                <span className="font-semibold">+{total.total}</span>
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

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">{nickname}&apos;s COMO is private</p>
    </div>
  );
}
