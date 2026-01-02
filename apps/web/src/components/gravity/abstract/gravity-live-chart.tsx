import Portal from "@/components/portal";
import { m } from "@/i18n/messages";
import {
  useChainData,
  useCurrentDate,
} from "@/lib/client/gravity/abstract/hooks";
import { useGravityPoll } from "@/lib/client/gravity/common";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@apollo/cosmo/types/gravity";
import { useMemo } from "react";
import CandidateBreakdown from "../candidate-breakdown";
import TimelineChart from "./timeline-chart";
import VoterBreakdown from "./voter-breakdown";

export type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
  pollId: number;
};

export default function AbstractLiveChart(props: Props) {
  const now = useCurrentDate();
  const { data: poll } = useGravityPoll({
    artistName: props.artist.id,
    tokenId: BigInt(props.artist.comoTokenId),
    gravityId: props.gravity.id,
    pollId: props.pollId,
  });
  const chain = useChainData({
    startDate: poll.startDate,
    endDate: poll.endDate,
    tokenId: BigInt(props.artist.comoTokenId),
    pollId: BigInt(poll.id),
    now,
  });

  // get the number of como used for each candidate
  const { comoByCandidate, comoUsed } = useMemo(() => {
    const comoMap: Record<number, number> = {};
    let used = 0;
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = chain.comoPerCandidate[i] ?? 0;
      comoMap[i] = chainComo;
      used += chainComo;
    }
    return { comoByCandidate: comoMap, comoUsed: used };
  }, [poll.pollViewMetadata.selectedContent, chain.comoPerCandidate]);

  // calculate the percentage of votes counted.
  const percentageCounted = useMemo(() => {
    if (chain.totalVotesCount === 0) return "0";

    const pct =
      ((chain.totalVotesCount - chain.remainingVotesCount) /
        chain.totalVotesCount) *
      100;

    if (pct === 0 || pct === 100) return String(pct);
    return pct.toFixed(2);
  }, [chain.totalVotesCount, chain.remainingVotesCount]);

  const totalVotes = chain.totalVotesCount;
  const countedVotes = totalVotes - chain.remainingVotesCount;

  return (
    <div className="flex w-full flex-col gap-2">
      <TimelineChart
        chartData={chain.chartData}
        liveStatus={chain.liveStatus}
        totalComoUsed={comoUsed}
      />

      <CandidateBreakdown
        content={poll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        liveStatus={chain.liveStatus}
        isRefreshing={chain.isRefreshing}
      />

      {chain.topVotes.some((v) => v.candidateId !== null) && (
        <VoterBreakdown
          topVotes={chain.topVotes}
          topUsers={chain.topUsers}
          candidates={poll.pollViewMetadata.selectedContent}
        />
      )}

      <Portal to="#gravity-status">
        <div className="flex flex-col items-end text-xs font-semibold">
          <p>{m.gravity_votes_counted()}</p>
          <p>
            {countedVotes.toLocaleString()}/{totalVotes.toLocaleString()} (
            {percentageCounted}%)
          </p>
        </div>
      </Portal>
    </div>
  );
}
