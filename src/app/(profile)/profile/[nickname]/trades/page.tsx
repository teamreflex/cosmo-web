import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { Shield } from "lucide-react";
import { isAddressEqual } from "@/lib/utils";

type Props = {
  params: { nickname: string };
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Trades`,
  };
}

export default async function UserTransfersPage({ params }: Props) {
  const user = await decodeUser();
  const { profile } = await getUserByIdentifier(params.nickname);
  if (
    profile.privacy.trades &&
    !isAddressEqual(user?.address, profile.address)
  ) {
    return <Private nickname={profile.nickname} />;
  }

  return (
    <section className="flex flex-col py-2">
      <TransfersRenderer address={profile.address} />
    </section>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s trades are private
      </p>
    </div>
  );
}
