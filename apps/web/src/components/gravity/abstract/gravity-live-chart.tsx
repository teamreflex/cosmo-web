import GravityHeader from "@/components/gravity/gravity-header";
import { m } from "@/i18n/messages";
import {
  useGravityData,
  usePollSlots,
  useReveals,
  useSlotRankings,
} from "@/lib/client/gravity/abstract/hooks";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import type { ChoiceStyle } from "@/lib/client/gravity/colors";
import { resolveChoiceStyles } from "@/lib/client/gravity/colors";
import type { ChartSeries } from "@/lib/client/gravity/series";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
} from "@apollo/cosmo/types/gravity";
import { useMemo } from "react";
import CandidateBreakdown from "../candidate-breakdown";
import Countdown from "../countdown";
import RecentVotes from "../recent-votes";
import UserRankings from "../user-rankings";
import VotingPanel from "../voting-panel";
import GravityStatus from "./gravity-status";
import type { TrajectoryLine } from "./timeline-chart";
import TimelineChart from "./timeline-chart";

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

  const slots = usePollSlots(poll);
  const rankings = useSlotRankings(
    slots,
    reveals.comoPerCandidate,
    reveals.latestBatch,
  );

  const choices = useMemo(
    () => resolveChoiceStyles(props.artist, slots),
    [props.artist, slots],
  );

  const lines = useMemo(
    () => buildTrajectoryLines(choices, reveals.chartSeries),
    [choices, reveals.chartSeries],
  );

  // picks stay sealed until the poll closes, so no candidate has data yet
  const sealed =
    reveals.liveStatus === "upcoming" || reveals.liveStatus === "voting";

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
        isRefreshing={reveals.isRefreshing}
        totalComoUsed={aggregated.totalComoCount}
        lines={lines}
        frontierSegmentIndex={reveals.chartSeries.frontierSegmentIndex}
      />

      <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        {sealed ? (
          <VotingPanel countingStartsAt={poll.endDate} />
        ) : (
          <CandidateBreakdown
            model={slots}
            rankings={rankings}
            artist={props.artist}
          />
        )}

        {sealed ? (
          <RecentVotes
            pollId={poll.id}
            enabled={reveals.liveStatus === "voting"}
          />
        ) : (
          <UserRankings
            topUsers={reveals.topUsers}
            topVotes={reveals.topVotes}
            choices={choices}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Name and color the top candidates' cumulative series.
 */
function buildTrajectoryLines(
  choices: Map<number, ChoiceStyle>,
  series: ChartSeries,
): TrajectoryLine[] {
  return series.series.flatMap((entry) => {
    const choice = choices.get(entry.candidateId);

    return choice === undefined
      ? []
      : [
          {
            candidateId: entry.candidateId,
            label: choice.label,
            color: choice.color,
            values: entry.values,
          },
        ];
  });
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
