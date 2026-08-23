import GravityHeader from "@/components/gravity/gravity-header";
import { m } from "@/i18n/messages";
import {
  useGravityData,
  usePollSlots,
  useReveals,
} from "@/lib/client/gravity/abstract/hooks";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import type { CandidateColorArtist } from "@/lib/client/gravity/colors";
import {
  resolveCandidateColor,
  resolveCandidateColors,
} from "@/lib/client/gravity/colors";
import type { ChartSeries } from "@/lib/client/gravity/series";
import type { PollSlotModel } from "@/lib/client/gravity/slots";
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
import type { TrajectoryLine } from "./timeline-chart";
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
  const slots = usePollSlots(poll);

  const lines = useMemo(
    () =>
      buildTrajectoryLines({
        model: slots,
        artist: props.artist,
        series: reveals.chartSeries,
      }),
    [slots, props.artist, reveals.chartSeries],
  );

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
        isRefreshing={reveals.isRefreshing}
        totalComoUsed={aggregated.totalComoCount}
        lines={lines}
        frontierSegmentIndex={reveals.chartSeries.frontierSegmentIndex}
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

type TrajectoryLineInput = {
  model: PollSlotModel;
  artist: CandidateColorArtist;
  series: ChartSeries;
};

/**
 * Name and color the top candidates' cumulative series. A combination poll's
 * candidate is one choice spanning every slot, so it is named after the members
 * it picks and colored by the member it picks in the first slot.
 */
function buildTrajectoryLines(input: TrajectoryLineInput): TrajectoryLine[] {
  const { model, artist, series } = input;

  if (model.kind === "single") {
    const [slot] = model.slots;
    const colors = resolveCandidateColors(
      artist,
      slot.candidates.map((candidate) => candidate.name),
    );

    return series.series.flatMap((entry) => {
      const candidate = slot.candidates.find((slotCandidate) =>
        slotCandidate.candidateIds.includes(entry.candidateId),
      );

      return candidate === undefined
        ? []
        : [
            {
              candidateId: entry.candidateId,
              label: candidate.name,
              color: colors.color(entry.candidateId),
              values: entry.values,
            },
          ];
    });
  }

  return series.series.flatMap((entry) => {
    const picks = model.slots.flatMap((slot) => {
      const index = slot.candidates.findIndex((slotCandidate) =>
        slotCandidate.candidateIds.includes(entry.candidateId),
      );
      const candidate = slot.candidates[index];
      return candidate === undefined ? [] : [{ name: candidate.name, index }];
    });

    const [first] = picks;
    return first === undefined
      ? []
      : [
          {
            candidateId: entry.candidateId,
            label: picks.map((pick) => pick.name).join(" + "),
            color: resolveCandidateColor(artist, first.name, first.index),
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
