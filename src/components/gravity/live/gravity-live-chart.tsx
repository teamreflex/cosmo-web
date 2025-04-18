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
import VoterBreakdown from "./voter-breakdown";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function GravityLiveChart({ artist, gravity }: Props) {
  const { poll } = findPoll(gravity);
  const { data: fullPoll } = useSuspenseGravityPoll({
    artistName: artist.id,
    contract: artist.contracts.Governor,
    gravityId: gravity.id,
    pollId: poll.id,
  });
  const { isPending, comoByCandidate, totalComoUsed, revealedVotes } =
    useLiveData({
      contract: artist.contracts.Governor,
      pollId: BigInt(poll.pollIdOnChain),
    });

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center py-4">
        <Loader2 className="size-12 animate-spin" />
        <span className="text-sm font-semibold">Loading live data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-2">
      <TimelineChart
        start={fullPoll.startDate}
        end={fullPoll.endDate}
        revealedVotes={revealedVotes}
        totalComoUsed={totalComoUsed}
      />

      <CandidateBreakdown
        content={fullPoll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
      />

      <VoterBreakdown
        candidates={fullPoll.pollViewMetadata.selectedContent}
        contract={artist.contracts.Governor}
        pollId={poll.pollIdOnChain}
        revealedVotes={revealedVotes}
      />
    </div>
  );
}
