import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import GravitySection from "@/components/votes/gravity-section";
import { fetchUserVotes } from "@/lib/server/votes";
import { isAddressEqual } from "@/lib/utils";
import { Shield } from "lucide-react";
import { Metadata } from "next";

type Props = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Gravity Votes`,
  };
}

export default async function VotingPage(props: Props) {
  const params = await props.params;
  const [currentUser, targetUser] = await Promise.all([
    decodeUser(),
    getUserByIdentifier(params.nickname),
  ]);

  if (
    targetUser.profile.privacy.votes &&
    !isAddressEqual(currentUser?.address, targetUser.profile.address)
  ) {
    return <Private nickname={targetUser.profile.nickname} />;
  }

  const results = await fetchUserVotes(targetUser.profile.address).then((res) =>
    res.toSorted((a, b) => b.startDate.getTime() - a.startDate.getTime())
  );

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-semibold">No voting history found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {results.map((gravity, index) => (
        <GravitySection
          key={`gravity-${gravity.id}`}
          gravity={gravity}
          index={index}
        />
      ))}
    </div>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s voting history is private
      </p>
    </div>
  );
}
