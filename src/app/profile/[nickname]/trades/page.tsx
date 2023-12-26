import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import { getUserByIdentifier } from "@/app/data-fetching";

type Props = {
  params: { nickname: string };
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nickname } = await getUserByIdentifier(params.nickname);

  return {
    title: `${nickname}'s Trades`,
  };
}

export default async function UserTransfersPage({ params }: Props) {
  const profile = await getUserByIdentifier(params.nickname);

  return (
    <section className="flex flex-col py-2">
      <TransfersRenderer address={profile.address} />
    </section>
  );
}
