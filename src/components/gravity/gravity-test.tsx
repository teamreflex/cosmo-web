"use client";

import { useLiveData } from "@/lib/client/gravity/hooks";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { CosmoPastGravity } from "@/lib/universal/cosmo/gravity";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoPastGravity;
};

export default function GravityTest({ artist, gravity }: Props) {
  const pollIdOnChain = gravity.polls[0].pollIdOnChain;
  const contract = artist.contracts.Governor;

  const { revealedVotes } = useLiveData({
    contract: contract,
    pollId: BigInt(pollIdOnChain),
  });

  const calculatedVotes = revealedVotes.reduce((acc, vote) => {
    acc[vote.candidateId] = (acc[vote.candidateId] || 0) + vote.comoAmount;
    return acc;
  }, {} as Record<number, number>);

  console.log(calculatedVotes);

  return <div>GravityTest</div>;
}
