"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RevealedVote } from "@/lib/client/gravity/polygon/types";
import { CheckCircle } from "lucide-react";
import { Bar, BarChart } from "recharts";

type Props = {
  totalComoUsed: number;
  revealedVotes: RevealedVote[];
  start: string;
  end: string;
};

export default function TimelineChart(props: Props) {
  const chartData = generateChartData(props);

  const totalRevealed = props.revealedVotes.reduce(
    (acc, vote) => acc + vote.comoAmount,
    0
  );
  const isComplete = props.totalComoUsed === totalRevealed;

  return (
    <div className="flex flex-col gap-2 w-full bg-secondary rounded-md p-3 pb-0">
      <div className="flex items-center justify-between text-sm">
        {isComplete ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold">COMPLETE</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-semibold">LIVE</span>
            <span className="bg-red-500 rounded-full aspect-square shrink-0 w-2.5 animate-pulse" />
          </div>
        )}
        <p className="text-xs">{props.totalComoUsed.toLocaleString()} COMO</p>
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-40">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 0,
            right: 0,
          }}
        >
          <ChartTooltip
            labelFormatter={(_, payload) => {
              return `Block ${payload[0].payload.startBlock} ~ ${payload[0].payload.endBlock}`;
            }}
            content={<ChartTooltipContent indicator="dot" className="w-48" />}
            includeHidden
          />
          <Bar
            dataKey="comoAmount"
            radius={[4, 4, 0, 0]}
            fill="var(--color-cosmo)"
          />
          <Bar
            dataKey="voteCount"
            fill="oklch(from var(--color-cosmo) calc(l/2 + .5) c h)"
            hide
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

type ChartDataPoint = {
  startBlock: number;
  endBlock: number;
  voteCount: number;
  comoAmount: number;
};

// BLOCK_SEGMENT_SIZE represents ~30 minutes at 2.1 sec per block
const BLOCK_SEGMENT_SIZE = 850;

// generate chart data points with 850 block segments
function generateChartData(props: Props): ChartDataPoint[] {
  const { revealedVotes } = props;

  // if no votes, return empty array
  if (revealedVotes.length === 0) {
    return [];
  }

  // find min and max block numbers in a single loop
  let minBlock = Infinity;
  let maxBlock = -Infinity;

  for (const vote of revealedVotes) {
    if (vote.blockNumber < minBlock) minBlock = vote.blockNumber;
    if (vote.blockNumber > maxBlock) maxBlock = vote.blockNumber;
  }

  // calculate segments
  const segments: ChartDataPoint[] = [];
  const segmentMap: Record<number, ChartDataPoint> = {};

  // determine start and end blocks for segments
  let segmentStart = minBlock;

  while (segmentStart <= maxBlock) {
    const segmentEnd = segmentStart + BLOCK_SEGMENT_SIZE - 1;

    const segment = {
      startBlock: segmentStart,
      endBlock: segmentEnd,
      voteCount: 0,
      comoAmount: 0,
    };

    // store in array and map for quick lookup
    segments.push(segment);
    segmentMap[segmentStart] = segment;

    segmentStart = segmentEnd + 1;
  }

  // populate segments with vote data
  for (const vote of revealedVotes) {
    // calculate which segment this vote belongs to
    const segmentIndex = Math.floor(
      (vote.blockNumber - minBlock) / BLOCK_SEGMENT_SIZE
    );
    const segmentStart = minBlock + segmentIndex * BLOCK_SEGMENT_SIZE;

    const segment = segmentMap[segmentStart];
    if (segment) {
      segment.voteCount += 1;
      segment.comoAmount += vote.comoAmount;
    }
  }

  return segments;
}

const chartConfig = {
  tooltip: {
    label: "Stats",
  },
  voteCount: {
    label: "Votes",
  },
  comoAmount: {
    label: "COMO Used",
  },
} satisfies ChartConfig;
