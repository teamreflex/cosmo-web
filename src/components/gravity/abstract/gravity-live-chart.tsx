"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import CandidateBreakdown from "./candidate-breakdown";
import { useChainData } from "@/lib/client/gravity/abstract/hooks";
import { useMemo } from "react";
import {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import { useGravityPoll } from "@/lib/client/gravity/common";
import { findPoll } from "@/lib/client/gravity/util";
import GravitySkeleton from "../gravity-skeleton";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function AbstractLiveChart({ artist, gravity }: Props) {
  const { data: poll } = useGravityPoll({
    artistName: artist.id,
    tokenId: BigInt(artist.comoTokenId),
    gravityId: gravity.id,
    pollId: findPoll(gravity).poll.id,
  });
  const chain = useChainData({
    startDate: poll.startDate,
    tokenId: BigInt(artist.comoTokenId),
    pollId: BigInt(poll.id),
  });

  // get the number of como used for each candidate
  const { comoByCandidate, comoUsed } = useMemo(() => {
    const comoByCandidate: Record<string, number> = {};
    if (chain.status !== "success") {
      return { comoByCandidate, comoUsed: 0 };
    }

    let comoUsed = 0;
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = chain.comoPerCandidate?.[i] ?? 0;
      comoByCandidate[i] = chainComo;
      comoUsed += chainComo;
    }
    return { comoByCandidate, comoUsed };
  }, [poll.pollViewMetadata.selectedContent, chain]);

  if (chain.status === "pending") {
    return <GravitySkeleton />;
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
