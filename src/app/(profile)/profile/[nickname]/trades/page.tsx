import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import {
  getArtistsWithMembers,
  getUserByIdentifier,
} from "@/app/data-fetching";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";

type Props = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Trades`,
  };
}

export default async function UserTransfersPage(props: Props) {
  const params = await props.params;
  const targetUser = await getUserByIdentifier(params.nickname);
  const artists = getArtistsWithMembers();

  return (
    <section className="flex flex-col">
      <CosmoArtistProvider artists={artists}>
        <TransfersRenderer profile={targetUser.profile} artists={artists} />
      </CosmoArtistProvider>

      <div id="pagination" />
    </section>
  );
}
