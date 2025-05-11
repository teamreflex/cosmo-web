"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { Loader2 } from "lucide-react";
import CandidateBreakdown from "./candidate-breakdown";
import { useChainData } from "@/lib/client/gravity/hooks";
import { useMemo } from "react";
import { CosmoPollChoices } from "@/lib/universal/cosmo/gravity";

type Props = {
  artist: CosmoArtistBFF;
  poll: CosmoPollChoices;
};

export default function GravityLiveChart({ artist, poll }: Props) {
  const chain = useChainData({
    tokenId: artist.comoTokenId,
    pollId: BigInt(poll.id),
  });

  // get the number of como used for each candidate
  const { comoByCandidate, comoUsed } = useMemo(() => {
    const comoByCandidate: Record<string, number> = {};
    let comoUsed = 0;
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = chain.comoPerCandidate?.[i] ?? 0;
      comoByCandidate[i] = chainComo;
      comoUsed += chainComo;
    }
    return { comoByCandidate, comoUsed };
  }, [poll.pollViewMetadata.selectedContent, chain.comoPerCandidate]);

  if (chain.isPending) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center py-4">
        <Loader2 className="size-12 animate-spin" />
        <span className="text-sm font-semibold">Loading live data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-2">
      <CandidateBreakdown
        content={poll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        totalComoUsed={comoUsed}
      />
    </div>
  );
}
