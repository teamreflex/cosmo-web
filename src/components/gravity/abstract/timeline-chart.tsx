import { Bar, BarChart } from "recharts";
import { format } from "date-fns";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import GravityStatus from "./gravity-status";
import type { LiveStatus } from "@/lib/client/gravity/abstract/types";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useVotedEvents } from "@/lib/client/gravity/abstract/hooks";

type Props = {
  pollId: number;
  endDate: string;
  liveStatus: LiveStatus;
  totalComoUsed: number;
};

export default function TimelineChart(props: Props) {
  return (
    <Suspense
      fallback={
        <TimelineChartSkeleton
          liveStatus={props.liveStatus}
          totalComoUsed={props.totalComoUsed}
        />
      }
    >
      <TimelineChartContent {...props} />
    </Suspense>
  );
}

function TimelineChartSkeleton({
  liveStatus,
  totalComoUsed,
}: Pick<Props, "liveStatus" | "totalComoUsed">) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-secondary p-3 pb-0">
      <div className="flex items-center justify-between text-sm">
        <GravityStatus liveStatus={liveStatus} />
        <p className="text-xs">{totalComoUsed.toLocaleString()} COMO</p>
      </div>
      <div className="flex h-40 flex-col items-center justify-center p-2">
        <Loader2 className="size-8 animate-spin" />
      </div>
    </div>
  );
}

function TimelineChartContent(props: Props) {
  const data = useVotedEvents(props.pollId, props.endDate);

  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-secondary p-3 pb-0">
      <div className="flex items-center justify-between text-sm">
        <GravityStatus liveStatus={props.liveStatus} />
        <p className="text-xs">{props.totalComoUsed.toLocaleString()} COMO</p>
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-40">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{
            left: 0,
            right: 0,
          }}
        >
          <ChartTooltip
            labelFormatter={(_, payload) => {
              if (payload[0] && payload[0].payload.timestamp) {
                return format(
                  new Date(payload[0].payload.timestamp),
                  "MMM d, h:mm a",
                );
              }
              return "";
            }}
            content={<ChartTooltipContent indicator="dot" className="w-48" />}
            includeHidden
          />
          <Bar
            dataKey="totalTokenAmount"
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

const chartConfig = {
  tooltip: {
    label: "Stats",
  },
  voteCount: {
    label: "Votes",
  },
  totalTokenAmount: {
    label: "COMO Used",
  },
} satisfies ChartConfig;
