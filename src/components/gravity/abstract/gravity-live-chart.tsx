import type { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import CandidateBreakdown from "./candidate-breakdown";
import {
  useChainData,
  useCurrentDate,
} from "@/lib/client/gravity/abstract/hooks";
import { useMemo } from "react";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@/lib/universal/cosmo/gravity";
import { useGravityPoll } from "@/lib/client/gravity/common";
import { findPoll } from "@/lib/client/gravity/util";
import GravitySkeleton from "../gravity-skeleton";
import { AlertTriangle } from "lucide-react";
import Portal from "@/components/portal";
import TimelineChart from "./timeline-chart";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
};

export default function AbstractLiveChart({ artist, gravity }: Props) {
  const now = useCurrentDate();
  const { data: poll } = useGravityPoll({
    artistName: artist.id,
    tokenId: BigInt(artist.comoTokenId),
    gravityId: gravity.id,
    pollId: findPoll(gravity).poll.id,
  });
  const chain = useChainData({
    startDate: poll.startDate,
    endDate: poll.endDate,
    tokenId: BigInt(artist.comoTokenId),
    pollId: BigInt(poll.id),
    now,
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

  const percentageCounted =
    chain.status === "success"
      ? Math.round(
          ((chain.totalVotesCount - chain.remainingVotesCount) /
            chain.totalVotesCount) *
            100
        )
      : 0;

  if (chain.status === "pending") {
    return <GravitySkeleton />;
  }

  if (chain.status === "error") {
    return (
      <div className="flex flex-col w-full gap-2">
        <AlertTriangle className="size-12" />
        <p className="text-sm font-semibold">Error loading gravity</p>
      </div>
    );
  }

  const totalVotes = chain.totalVotesCount;
  const countedVotes = totalVotes - chain.remainingVotesCount;

  return (
    <div className="flex flex-col w-full gap-2">
      <TimelineChart
        endDate={poll.endDate}
        pollId={Number(poll.id)}
        liveStatus={chain.liveStatus}
        totalComoUsed={comoUsed}
      />

      <CandidateBreakdown
        content={poll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        totalComoUsed={comoUsed}
        liveStatus={chain.liveStatus}
        isRefreshing={chain.isRefreshing}
      />

      <Portal to="#gravity-status">
        <div className="flex flex-col items-end text-xs font-semibold">
          <p>Votes Counted</p>
          <p>
            {countedVotes.toLocaleString()}/{totalVotes.toLocaleString()} (
            {percentageCounted}%)
          </p>
        </div>
      </Portal>
    </div>
  );
}
