import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import {
  getArtistsWithMembers,
  getUserByIdentifier,
} from "@/app/data-fetching";
import AbstractWarning from "@/components/abstract-warning";

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
  const [{ profile }, artists] = await Promise.all([
    getUserByIdentifier(params.nickname),
    getArtistsWithMembers(),
  ]);

  return (
    <section className="flex flex-col gap-2">
      <AbstractWarning />

      <TransfersRenderer profile={profile} artists={artists} />

      <div id="pagination" />
    </section>
  );
}
