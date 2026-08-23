import type { ChartSegment, Reveal } from "./abstract/types";

/** Trajectory lines are drawn for this many candidates. */
export const TOP_CANDIDATE_COUNT = 3;

const SEGMENT_MS = 30 * 60 * 1000;

export type CandidateSeries = {
  candidateId: number;
  /**
   * Cumulative COMO, one entry per chart segment in the same order. Null past
   * the reveal frontier so the line breaks instead of flattening.
   */
  values: (number | null)[];
};

export type ChartSeries = {
  /** Highest COMO first, at most `TOP_CANDIDATE_COUNT` entries. */
  series: CandidateSeries[];
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
};

/**
 * Cumulative per-candidate COMO across the chart's segments, for the top
 * candidates by revealed COMO.
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

  const candidateIds = comoPerCandidate
    .map((como, candidateId) => ({ como, candidateId }))
    .filter((entry) => entry.como > 0)
    .sort((a, b) => b.como - a.como || a.candidateId - b.candidateId)
    .slice(0, TOP_CANDIDATE_COUNT)
    .map((entry) => entry.candidateId);

  const origin = Date.parse(firstSegment.timestamp);
  const increments = new Map(
    candidateIds.map((candidateId) => [
      candidateId,
      Array.from({ length: segmentCount }, () => 0),
    ]),
  );

  let frontier = -1;
  for (const reveal of reveals) {
    const index = Math.floor(
      (Date.parse(reveal.createdAt) - origin) / SEGMENT_MS,
    );
    if (index < 0 || index >= segmentCount) continue;
    if (index > frontier) frontier = index;

    // absent for candidates outside the top
    const segments = increments.get(reveal.candidateId);
    if (segments !== undefined) {
      segments[index] = (segments[index] ?? 0) + reveal.amount;
    }
  }

  if (complete) {
    frontier = segmentCount - 1;
  }

  return {
    series: candidateIds.map((candidateId) => {
      const segments = increments.get(candidateId) ?? [];
      let cumulative = 0;

      return {
        candidateId,
        values: Array.from({ length: segmentCount }, (_, index) => {
          if (index > frontier) return null;
          cumulative += segments[index] ?? 0;
          return cumulative;
        }),
      };
    }),
    frontierSegmentIndex: frontier,
  };
}
