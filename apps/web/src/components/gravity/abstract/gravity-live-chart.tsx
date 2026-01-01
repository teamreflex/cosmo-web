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
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import GravitySkeleton from "../gravity-skeleton";
import CandidateBreakdown from "./candidate-breakdown";
import TimelineChart from "./timeline-chart";

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
    const comoMap: Record<string, number> = {};
    if (chain.status !== "success") {
      return { comoByCandidate: comoMap, comoUsed: 0 };
    }

    let used = 0;
    for (let i = 0; i < poll.pollViewMetadata.selectedContent.length; i++) {
      const chainComo = chain.comoPerCandidate[i] ?? 0;
      comoMap[i] = chainComo;
      used += chainComo;
    }
    return { comoByCandidate: comoMap, comoUsed: used };
  }, [poll.pollViewMetadata.selectedContent, chain]);

  // calculate the percentage of votes counted.
  const percentageCounted = useMemo(() => {
    if (chain.status !== "success") return "0";

    const pct =
      ((chain.totalVotesCount - chain.remainingVotesCount) /
        chain.totalVotesCount) *
      100;

    if (pct === 0 || pct === 100) return String(pct);
    return pct.toFixed(2);
  }, [chain]);

  if (chain.status === "pending") {
    return <GravitySkeleton />;
  }

  if (chain.status === "error") {
    return (
      <div className="flex w-full flex-col gap-2">
        <IconAlertTriangle className="size-12" />
        <p className="text-sm font-semibold">{m.gravity_error_loading()}</p>
      </div>
    );
  }

  const totalVotes = chain.totalVotesCount;
  const countedVotes = totalVotes - chain.remainingVotesCount;

  return (
    <div className="flex w-full flex-col gap-2">
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
