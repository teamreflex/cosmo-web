import Portal from "@/components/portal";
import { m } from "@/i18n/messages";
import {
  useGravityData,
  useReveals,
} from "@/lib/client/gravity/abstract/hooks";
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
  const { poll, aggregated } = useGravityData({
    artistName: props.artist.id,
    tokenId: props.artist.comoTokenId,
    gravityId: props.gravity.id,
    pollId: props.pollId,
  });
  const reveals = useReveals({
    pollId: poll.id,
    endDate: poll.endDate,
    aggregated,
  });

  // get the number of como used for each candidate
  const comoByCandidate = useMemo(() => {
    const comoMap: Record<number, number> = {};
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = reveals.comoPerCandidate[i] ?? 0;
      comoMap[i] = chainComo;
    }
    return comoMap;
  }, [poll.pollViewMetadata.selectedContent, reveals.comoPerCandidate]);

  // calculate the percentage of votes counted.
  const percentageCounted = useMemo(() => {
    if (reveals.totalVotesCount === 0) return "0";

    const pct =
      ((reveals.totalVotesCount - reveals.remainingVotesCount) /
        reveals.totalVotesCount) *
      100;

    if (pct === 0 || pct === 100) return String(pct);
    return pct.toFixed(2);
  }, [reveals.totalVotesCount, reveals.remainingVotesCount]);

  const totalVotes = reveals.totalVotesCount;
  const countedVotes = totalVotes - reveals.remainingVotesCount;

  return (
    <div className="flex w-full flex-col gap-2">
      <TimelineChart
        chartData={reveals.chartData}
        liveStatus={reveals.liveStatus}
        totalComoUsed={aggregated.totalComoCount}
      />

      <CandidateBreakdown
        content={poll.pollViewMetadata.selectedContent}
        comoByCandidate={comoByCandidate}
        liveStatus={reveals.liveStatus}
        isRefreshing={reveals.isRefreshing}
      />

      <VoterBreakdown
        topVotes={reveals.topVotes}
        topUsers={reveals.topUsers}
        candidates={poll.pollViewMetadata.selectedContent}
      />

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
