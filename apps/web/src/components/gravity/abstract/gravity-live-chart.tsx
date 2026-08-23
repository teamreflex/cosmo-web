import GravityHeader from "@/components/gravity/gravity-header";
import { m } from "@/i18n/messages";
import {
  useGravityData,
  useReveals,
} from "@/lib/client/gravity/abstract/hooks";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import { pollCandidates } from "@/lib/client/gravity/util";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
} from "@apollo/cosmo/types/gravity";
import { useMemo } from "react";
import CandidateBreakdown from "../candidate-breakdown";
import Countdown from "../countdown";
import GravityStatus from "./gravity-status";
import TimelineChart from "./timeline-chart";
import VoterBreakdown from "./voter-breakdown";

export type Props = {
  artist: CosmoArtistWithMembersBFF;
  gravity: CosmoOngoingGravity | CosmoPastGravity;
  /** Number of polls in the gravity, for the header's meta line. */
  pollCount: number;
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
    startDate: poll.startDate,
    endDate: poll.endDate,
    aggregated,
  });

  const candidates = pollCandidates(poll);

  // get the number of como used for each candidate
  const comoByCandidate = useMemo(() => {
    const comoMap: Record<number, number> = {};
    for (let i = 0; i < candidates.length; i++) {
      const chainComo = reveals.comoPerCandidate[i] ?? 0;
      comoMap[i] = chainComo;
    }
    return comoMap;
  }, [candidates, reveals.comoPerCandidate]);

  return (
    <div className="flex w-full flex-col gap-2">
      <GravityHeader
        gravity={props.gravity}
        pollCount={props.pollCount}
        meta={
          reveals.liveStatus === "voting" ? (
            <span>
              {m.gravity_votes_so_far({ count: reveals.totalVotesCount })}
            </span>
          ) : undefined
        }
        status={
          <HeaderStatus
            liveStatus={reveals.liveStatus}
            poll={poll}
            gravityEndDate={props.gravity.entireEndDate}
            revealedVotes={
              reveals.totalVotesCount - reveals.remainingVotesCount
            }
            totalVotes={reveals.totalVotesCount}
          />
        }
      />

      <TimelineChart
        chartData={reveals.chartData}
        liveStatus={reveals.liveStatus}
        totalComoUsed={aggregated.totalComoCount}
      />

      <CandidateBreakdown
        content={candidates}
        comoByCandidate={comoByCandidate}
        liveStatus={reveals.liveStatus}
        isRefreshing={reveals.isRefreshing}
      />

      <VoterBreakdown
        topVotes={reveals.topVotes}
        topUsers={reveals.topUsers}
        candidates={candidates}
      />
    </div>
  );
}

type HeaderStatusProps = {
  liveStatus: LiveStatus;
  poll: CosmoPollChoices;
  gravityEndDate: string;
  revealedVotes: number;
  totalVotes: number;
};

/**
 * The one piece of state the header carries, per phase: reveal progress while
 * counting, completion once done, and a countdown before then.
 */
function HeaderStatus(props: HeaderStatusProps) {
  if (props.liveStatus === "live") {
    return (
      <p className="shrink-0 font-mono text-xs text-muted-foreground">
        {m.gravity_revealed_progress({
          counted: props.revealedVotes.toLocaleString(),
          total: props.totalVotes.toLocaleString(),
        })}
      </p>
    );
  }

  if (props.liveStatus === "finalized") {
    return <GravityStatus liveStatus="finalized" />;
  }

  return (
    <Countdown
      className="shrink-0"
      pollStartDate={new Date(props.poll.startDate)}
      pollEndDate={new Date(props.poll.endDate)}
      gravityEndDate={new Date(props.gravityEndDate)}
    />
  );
}
