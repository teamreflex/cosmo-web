import type { PollSlotModel } from "./slots";
import type {
  ChartSegment,
  FinalizedReveals,
  Reveal,
  RevealedSegments,
} from "./types";

/** Trajectory lines a single poll draws, for its leading candidates. */
export const TOP_CANDIDATE_COUNT = 3;

const SEGMENT_MS = 30 * 60 * 1000;

/**
 * The candidates one line covers: a single poll's candidate owns one id, while
 * a combination poll's slot member owns every choice placing it in that slot.
 */
export type SeriesGroup = {
  key: string;
  /** On-chain candidate ids, indexes into `comoPerCandidate`. */
  candidateIds: number[];
};

export type GroupSeries = {
  key: string;
  /**
   * Cumulative COMO, one entry per chart segment in the same order. Null past
   * the reveal frontier so the line breaks instead of flattening.
   */
  values: (number | null)[];
};

export type ChartSeries = {
  /** Highest COMO first within a slot, slots in their own order. */
  series: GroupSeries[];
  /**
   * Index of the last segment holding a revealed vote, or -1 when none do, so
   * `index > frontierSegmentIndex` always marks a segment as unrevealed.
   */
  frontierSegmentIndex: number;
};

type ChartSeriesInput = {
  chartData: ChartSegment[];
  revealed: RevealedSegments;
  comoPerCandidate: number[];
  /** Every vote is revealed, so the frontier is the whole poll. */
  complete: boolean;
  /** Groups a line may be drawn for, per slot. */
  groups: SeriesGroup[][];
  linesPerSlot: number;
};

/**
 * Lines a slot contributes: a combination poll draws each slot's top two, a
 * single or unit poll races everything in one slot and draws its top
 * candidates.
 */
export function slotLineCount(model: PollSlotModel): number {
  return model.kind === "combination" ? 2 : TOP_CANDIDATE_COUNT;
}

/**
 * Bucket polled reveals into the chart's segments per candidate.
 *
 * Reveals are bucketed by their vote's timestamp, mirroring the aggregated
 * endpoint's chart buckets. Segments are a uniform 30 minutes, so offsets
 * from the first one reproduce the endpoint's buckets without depending on the
 * client and the server sharing a timezone. Votes falling outside the segments
 * are dropped, as they are server-side.
 */
export function bucketReveals(
  chartData: ChartSegment[],
  reveals: Reveal[],
): RevealedSegments {
  const segmentCount = chartData.length;
  const firstSegment = chartData[0];
  const amounts = new Map<number, number[]>();

  let frontier = -1;
  if (firstSegment !== undefined) {
    const origin = Date.parse(firstSegment.timestamp);

    for (const reveal of reveals) {
      const index = Math.floor(
        (Date.parse(reveal.createdAt) - origin) / SEGMENT_MS,
      );
      if (index < 0 || index >= segmentCount) continue;
      if (index > frontier) frontier = index;

      let segments = amounts.get(reveal.candidateId);
      if (segments === undefined) {
        segments = Array.from({ length: segmentCount }, () => 0);
        amounts.set(reveal.candidateId, segments);
      }
      segments[index] = (segments[index] ?? 0) + reveal.amount;
    }
  }

  return {
    revealCount: reveals.length,
    amounts,
    frontierSegmentIndex: frontier,
  };
}

/**
 * The finalized payload's per-candidate segments, keyed for `computeChartSeries`.
 */
export function finalizedSegments(
  finalized: FinalizedReveals,
  revealCount: number,
): RevealedSegments {
  let frontier = -1;
  for (const { amounts } of finalized.segments) {
    frontier = Math.max(
      frontier,
      amounts.findLastIndex((amount) => amount > 0),
    );
  }

  return {
    revealCount,
    amounts: new Map(
      finalized.segments.map((segment) => [
        segment.candidateId,
        segment.amounts,
      ]),
    ),
    frontierSegmentIndex: frontier,
  };
}

/**
 * Cumulative COMO across the chart's segments for each drawn line.
 */
export function computeChartSeries(input: ChartSeriesInput): ChartSeries {
  const { chartData, revealed, comoPerCandidate, complete } = input;
  const segmentCount = chartData.length;

  if (segmentCount === 0 || revealed.revealCount === 0) {
    return {
      series: [],
      frontierSegmentIndex: complete ? segmentCount - 1 : -1,
    };
  }

  const frontier = complete ? segmentCount - 1 : revealed.frontierSegmentIndex;
  const lines = input.groups.flatMap((slot) =>
    leadingGroups(slot, comoPerCandidate, input.linesPerSlot),
  );

  return {
    series: lines.map((line) => {
      let cumulative = 0;

      return {
        key: line.key,
        values: Array.from({ length: segmentCount }, (_, index) => {
          if (index > frontier) return null;

          // a combination vote picks one member per slot, so a candidate can
          // feed a line in every slot at once
          for (const candidateId of line.candidateIds) {
            cumulative += revealed.amounts.get(candidateId)?.[index] ?? 0;
          }
          return cumulative;
        }),
      };
    }),
    frontierSegmentIndex: frontier,
  };
}

/**
 * A slot's highest groups by revealed COMO. Groups nobody voted for are left
 * undrawn, and the key breaks ties so the selection is stable between renders.
 */
function leadingGroups(
  groups: SeriesGroup[],
  comoPerCandidate: number[],
  limit: number,
): SeriesGroup[] {
  return groups
    .map((group) => ({
      group,
      como: group.candidateIds.reduce(
        (total, candidateId) => total + (comoPerCandidate[candidateId] ?? 0),
        0,
      ),
    }))
    .filter((entry) => entry.como > 0)
    .sort((a, b) => b.como - a.como || a.group.key.localeCompare(b.group.key))
    .slice(0, limit)
    .map((entry) => entry.group);
}
