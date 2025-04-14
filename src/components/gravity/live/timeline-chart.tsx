import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RevealedVote } from "@/lib/client/gravity/types";
import { CheckCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid } from "recharts";

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
    <div className="flex flex-col gap-2 w-full bg-accent rounded-md p-3 pb-0">
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
          <CartesianGrid vertical={false} />
          <ChartTooltip
            labelFormatter={(_, payload) => {
              const date = payload[0].payload.timeSegment;
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }}
            content={<ChartTooltipContent indicator="dot" className="w-40" />}
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
  timeSegment: Date;
  voteCount: number;
  comoAmount: number;
};

// calculate timestamp from block number using 2.1 sec average block time
function getTimestampFromBlock(
  blockNumber: number,
  referenceBlockNumber: number,
  referenceTimestamp: string
): Date {
  const blockDifference = blockNumber - referenceBlockNumber;
  const secondsDifference = blockDifference * 2.1;
  const referenceDate = new Date(referenceTimestamp);

  return new Date(referenceDate.getTime() + secondsDifference * 1000);
}

// generate 30-minute chart data points between start and end times
function generateChartData(props: Props): ChartDataPoint[] {
  const { revealedVotes, start, end } = props;

  // find earliest vote
  let earliestVote: RevealedVote | undefined;
  if (revealedVotes.length > 0) {
    const minBlockNumber = Math.min(
      ...revealedVotes.map((vote) => vote.blockNumber)
    );
    earliestVote = revealedVotes.find(
      (vote) => vote.blockNumber === minBlockNumber
    );
  }

  // create array of 30-minute segments from start to end
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeSegments: ChartDataPoint[] = [];

  // round down to the nearest 30-minute interval
  const currentSegment = new Date(startDate);
  currentSegment.setMinutes(
    Math.floor(currentSegment.getMinutes() / 30) * 30,
    0,
    0
  );

  while (currentSegment <= endDate) {
    timeSegments.push({
      timeSegment: new Date(currentSegment),
      voteCount: 0,
      comoAmount: 0,
    });

    // add 30 minutes
    currentSegment.setMinutes(currentSegment.getMinutes() + 30);
  }

  // if there are no votes, return empty segments
  if (!earliestVote) {
    return timeSegments;
  }

  const referenceBlockNumber = earliestVote.blockNumber;

  // group votes into 30-minute segments
  revealedVotes.forEach((vote) => {
    const voteTimestamp = getTimestampFromBlock(
      vote.blockNumber,
      referenceBlockNumber,
      start
    );
    const segment = timeSegments.find((segment) => {
      const nextSegment = new Date(segment.timeSegment);
      nextSegment.setMinutes(nextSegment.getMinutes() + 30);
      return (
        voteTimestamp >= segment.timeSegment && voteTimestamp < nextSegment
      );
    });

    if (segment) {
      segment.voteCount += 1;
      segment.comoAmount += vote.comoAmount;
    }
  });

  // remove trailing empty segments
  let lastNonEmptyIndex = timeSegments.length - 1;
  while (
    lastNonEmptyIndex >= 0 &&
    timeSegments[lastNonEmptyIndex].voteCount === 0 &&
    timeSegments[lastNonEmptyIndex].comoAmount === 0
  ) {
    lastNonEmptyIndex--;
  }

  // return segments up to and including the last non-empty one
  // if all segments are empty, keep at least the first segment
  return timeSegments.slice(0, Math.max(1, lastNonEmptyIndex + 1));
}

const chartConfig = {
  tooltip: {
    label: "Stats",
  },
  voteCount: {
    label: "Votes",
    color: "hsl(var(--chart-1))",
  },
  comoAmount: {
    label: "COMO Used",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;
