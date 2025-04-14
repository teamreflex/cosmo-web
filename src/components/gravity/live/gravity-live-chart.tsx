"use client";

import {
  useLiveData,
  useSuspenseGravityPoll,
} from "@/lib/client/gravity/hooks";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import { Loader2 } from "lucide-react";
import CandidateBreakdown from "./candidate-breakdown";
import TimelineChart from "./timeline-chart";
import { findPoll } from "@/lib/client/gravity/util";
// import { useState, useEffect } from "react";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function GravityLiveChart({ artist, gravity }: Props) {
  const { poll } = findPoll(gravity);
  const { data: fullPoll } = useSuspenseGravityPoll({
    artistName: gravity.artist,
    gravityId: gravity.id,
    pollId: poll.id,
  });
  const { isPending, comoByCandidate, totalComoUsed, revealedVotes } =
    useLiveData({
      contract: artist.contracts.Governor,
      pollId: BigInt(poll.pollIdOnChain),
    });

  // const [test, setTest] = useState<Record<number, number>>(() => {
  //   return Array.from(
  //     { length: fullPoll.pollViewMetadata.selectedContent.length },
  //     () => Math.floor(Math.random() * 1000)
  //   );
  // });
  // const testTotal = Object.values(test).reduce((acc, curr) => acc + curr, 0);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setTest((prev) => {
  //       return {
  //         0: prev[0] + Math.floor(Math.random() * 1000),
  //         1: prev[1] + Math.floor(Math.random() * 1000),
  //       };
  //     });
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, []);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center py-4">
        <Loader2 className="size-12 animate-spin" />
        <span className="text-sm font-semibold">Loading live data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <TimelineChart
        start={fullPoll.startDate}
        end={fullPoll.endDate}
        revealedVotes={revealedVotes}
        totalComoUsed={totalComoUsed}
      />

      <CandidateBreakdown
        content={fullPoll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        totalComoUsed={totalComoUsed}
      />
    </div>
  );
}
