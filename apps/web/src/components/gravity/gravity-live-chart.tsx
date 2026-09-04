import GravityHeader from "@/components/gravity/gravity-header";
import { m } from "@/i18n/messages";
import type { ChartLine } from "@/lib/client/gravity/colors";
import {
  hashedColor,
  resolveChartLines,
  resolveChoiceStyles,
} from "@/lib/client/gravity/colors";
import {
  useChartSeries,
  useGravityData,
  usePollSlots,
  useReveals,
  useSlotRankings,
} from "@/lib/client/gravity/hooks";
import type { ChartSeries } from "@/lib/client/gravity/series";
import type { LiveStatus } from "@/lib/client/gravity/types";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoPollChoices,
} from "@apollo/cosmo/types/gravity";
import { useMemo } from "react";
import CandidateBreakdown from "./candidate-breakdown";
import Countdown from "./countdown";
import type { TrajectoryLine } from "./timeline-chart";
import TimelineChart from "./timeline-chart";
import UserRankings from "./user-rankings";
import VotingPanel from "./voting-panel";

export type Props = {
  artist: CosmoArtistWithMembersBFF;
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
    startDate: poll.startDate,
    endDate: poll.endDate,
    aggregated,
  });

  const slots = usePollSlots(poll, props.artist.artistMembers);
  const rankings = useSlotRankings(
    slots,
    reveals.comoPerCandidate,
    reveals.latestBatch,
  );

  const choices = useMemo(
    () => resolveChoiceStyles(props.artist, slots, poll),
    [props.artist, slots, poll],
  );

  const groups = useMemo(
    () => resolveChartLines(props.artist, slots),
    [props.artist, slots],
  );
  const series = useChartSeries(slots, groups, reveals);
  const lines = useMemo(
    () => buildTrajectoryLines(groups, series),
    [groups, series],
  );

  // picks stay sealed until the poll closes, so no candidate has data yet
  const sealed =
    reveals.liveStatus === "upcoming" || reveals.liveStatus === "voting";

  return (
    <div className="flex w-full flex-col gap-2">
      <GravityHeader
        gravity={props.gravity}
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
        frontierSegmentIndex={series.frontierSegmentIndex}
      />

      {/* the rail is wide enough for its three tabs in every locale */}
      <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_384px]">
        {sealed ? (
          <VotingPanel countingStartsAt={poll.endDate} />
        ) : (
          <CandidateBreakdown
            model={slots}
            rankings={rankings}
            artist={props.artist}
          />
        )}

        <UserRankings
          topUsers={reveals.topUsers}
          topVotes={reveals.topVotes}
          choices={choices}
          recentVotesPollId={sealed ? poll.id : undefined}
        />
      </div>
    </div>
  );
}

/**
 * Name and color each drawn series.
 */
function buildTrajectoryLines(
  groups: ChartLine[][],
  series: ChartSeries,
): TrajectoryLine[] {
  const byKey = new Map(groups.flat().map((group) => [group.key, group]));
  // a member can race in two slots; hashing the second line's color keeps the
  // two apart rather than drawing one over the other
  const drawn = new Set<string>();

  return series.series.flatMap((entry) => {
    const group = byKey.get(entry.key);
    if (group === undefined) {
      return [];
    }

    // a pairing is unique in its two members, so it dedupes on the pair
    const identity = group.gradient?.join("→") ?? group.color;
    const collides = drawn.has(identity);
    const color = collides ? hashedColor(group.key) : group.color;
    drawn.add(collides ? color : identity);

    return [
      {
        key: entry.key,
        label: group.label,
        color,
        // a re-hashed line has left its members behind, so it draws solid
        gradient: collides ? null : group.gradient,
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
 * counting, and a countdown before then. A finished poll says so on the chart
 * card, which leaves the title the full width here.
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
    return null;
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
