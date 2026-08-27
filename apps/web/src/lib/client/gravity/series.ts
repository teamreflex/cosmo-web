import type { PollSlotModel } from "./slots";
import type { ChartSegment, Reveal } from "./types";

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
  reveals: Reveal[];
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
 * Cumulative COMO across the chart's segments for each drawn line.
 *
 * Reveals are bucketed by their vote's timestamp, mirroring the aggregated
 * endpoint's `computeChartData`. Segments are a uniform 30 minutes, so offsets
 * from the first one reproduce the endpoint's buckets without depending on the
 * client and the server sharing a timezone. Votes falling outside the segments
 * are dropped, as they are server-side.
 */
export function computeChartSeries(input: ChartSeriesInput): ChartSeries {
  const { chartData, reveals, comoPerCandidate, complete } = input;
  const segmentCount = chartData.length;
  const firstSegment = chartData[0];

  if (firstSegment === undefined || reveals.length === 0) {
    return {
      series: [],
      frontierSegmentIndex: complete ? segmentCount - 1 : -1,
    };
  }

  const lines = input.groups.flatMap((slot) =>
    leadingGroups(slot, comoPerCandidate, input.linesPerSlot).map((group) => ({
      key: group.key,
      segments: Array.from({ length: segmentCount }, () => 0),
      candidateIds: group.candidateIds,
    })),
  );

  // a combination vote picks one member per slot, so a reveal can feed a line
  // in every slot at once
  const targets = new Map<number, number[][]>();
  for (const line of lines) {
    for (const candidateId of line.candidateIds) {
      const existing = targets.get(candidateId);
      if (existing === undefined) {
        targets.set(candidateId, [line.segments]);
      } else {
        existing.push(line.segments);
      }
    }
  }

  const origin = Date.parse(firstSegment.timestamp);

  let frontier = -1;
  for (const reveal of reveals) {
    const index = Math.floor(
      (Date.parse(reveal.createdAt) - origin) / SEGMENT_MS,
    );
    if (index < 0 || index >= segmentCount) continue;
    if (index > frontier) frontier = index;

    // empty for candidates no drawn line covers
    for (const segments of targets.get(reveal.candidateId) ?? []) {
      segments[index] = (segments[index] ?? 0) + reveal.amount;
    }
  }

  if (complete) {
    frontier = segmentCount - 1;
  }

  return {
    series: lines.map((line) => {
      let cumulative = 0;

      return {
        key: line.key,
        values: Array.from({ length: segmentCount }, (_, index) => {
          if (index > frontier) return null;
          cumulative += line.segments[index] ?? 0;
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
