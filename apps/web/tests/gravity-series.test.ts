import { describe, expect, it } from "bun:test";
import type {
  ChartSegment,
  Reveal,
} from "../src/lib/client/gravity/abstract/types";
import { computeChartSeries } from "../src/lib/client/gravity/series";

const pollStart = Date.parse("2023-04-21T09:00:00.000Z");
const segmentMs = 30 * 60 * 1000;

/** Segments as the aggregated endpoint emits them: uniform 30-minute steps. */
function segments(count: number): ChartSegment[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: new Date(pollStart + index * segmentMs).toISOString(),
    voteCount: 0,
    totalTokenAmount: 0,
  }));
}

/** A reveal cast `minutes` into the poll. */
function reveal(
  id: string,
  candidateId: number,
  amount: number,
  minutes: number,
): Reveal {
  return {
    id,
    candidateId,
    amount,
    createdAt: new Date(pollStart + minutes * 60 * 1000).toISOString(),
  };
}

const chartData = segments(4);
const reveals = [
  reveal("1", 0, 10, 5), // segment 0
  reveal("2", 1, 4, 20), // segment 0
  reveal("3", 0, 6, 45), // segment 1
  reveal("4", 2, 3, 50), // segment 1
  reveal("5", 1, 8, 70), // segment 2
  reveal("6", 3, 1, 75), // segment 2
];
const como = [16, 12, 3, 1];

describe("computeChartSeries", () => {
  it("accumulates the top candidates across segments", () => {
    const { series } = computeChartSeries({
      chartData,
      reveals,
      comoPerCandidate: como,
      complete: false,
    });

    expect(series.map((line) => line.candidateId)).toEqual([0, 1, 2]);
    expect(series[0]?.values).toEqual([10, 16, 16, null]);
    expect(series[1]?.values).toEqual([4, 4, 12, null]);
    expect(series[2]?.values).toEqual([0, 3, 3, null]);
  });

  it("stops the lines at the reveal frontier", () => {
    const { frontierSegmentIndex } = computeChartSeries({
      chartData,
      reveals,
      comoPerCandidate: como,
      complete: false,
    });

    expect(frontierSegmentIndex).toBe(2);
  });

  it("spans the whole poll once every vote is revealed", () => {
    const { series, frontierSegmentIndex } = computeChartSeries({
      chartData,
      reveals,
      comoPerCandidate: como,
      complete: true,
    });

    expect(frontierSegmentIndex).toBe(3);
    // the trailing segment holds no reveals, so the line carries its total across
    expect(series[0]?.values).toEqual([10, 16, 16, 16]);
  });

  it("has no series or frontier while voting", () => {
    const result = computeChartSeries({
      chartData,
      reveals: [],
      comoPerCandidate: [],
      complete: false,
    });

    expect(result.series).toEqual([]);
    expect(result.frontierSegmentIndex).toBe(-1);
  });

  it("drops reveals outside the segments", () => {
    const outside = [
      reveal("early", 0, 100, -40),
      ...reveals,
      reveal("late", 0, 100, 300),
    ];
    const { series, frontierSegmentIndex } = computeChartSeries({
      chartData,
      reveals: outside,
      comoPerCandidate: como,
      complete: false,
    });

    expect(frontierSegmentIndex).toBe(2);
    expect(series[0]?.values).toEqual([10, 16, 16, null]);
  });

  it("draws fewer lines than there are candidates when only one voted", () => {
    const { series } = computeChartSeries({
      chartData,
      reveals: [reveal("1", 2, 5, 5)],
      comoPerCandidate: [0, 0, 5],
      complete: false,
    });

    expect(series.map((line) => line.candidateId)).toEqual([2]);
  });

  it("moves the frontier for a candidate outside the top", () => {
    const { series, frontierSegmentIndex } = computeChartSeries({
      chartData,
      reveals: [...reveals, reveal("7", 3, 1, 100)],
      comoPerCandidate: como,
      complete: false,
    });

    // segment 3 belongs to the last-placed candidate, but it is still revealed
    expect(frontierSegmentIndex).toBe(3);
    expect(series[0]?.values).toEqual([10, 16, 16, 16]);
  });

  it("buckets identically across host TZs", () => {
    // segments are offsets from the first one, so nothing may read local time —
    // the client and the server that built the segments need not share a zone
    const originalTz = process.env.TZ;

    function computeIn(tz: string) {
      process.env.TZ = tz;
      return computeChartSeries({
        chartData,
        reveals,
        comoPerCandidate: como,
        complete: false,
      });
    }

    try {
      const utc = computeIn("UTC");
      expect(computeIn("Asia/Kolkata")).toEqual(utc);
      expect(computeIn("Pacific/Chatham")).toEqual(utc);
      expect(computeIn("America/New_York")).toEqual(utc);
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});
