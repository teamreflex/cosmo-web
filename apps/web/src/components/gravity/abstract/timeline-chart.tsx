import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { m } from "@/i18n/messages";
import type { ChartSegment, LiveStatus } from "@/lib/client/gravity/abstract/types";
import { format } from "date-fns";
import { Bar, BarChart } from "recharts";
import GravityStatus from "./gravity-status";

type Props = {
  chartData: ChartSegment[];
  liveStatus: LiveStatus;
  totalComoUsed: number;
};

export default function TimelineChart(props: Props) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-secondary p-3 pb-0">
      <div className="flex items-center justify-between text-sm">
        <GravityStatus liveStatus={props.liveStatus} />
        <p className="text-xs">{props.totalComoUsed.toLocaleString()} COMO</p>
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-40">
        <BarChart
          accessibilityLayer
          data={props.chartData}
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
    get label() {
      return m.stats_header();
    },
  },
  voteCount: {
    get label() {
      return m.chart_votes();
    },
  },
  totalTokenAmount: {
    get label() {
      return m.chart_como_used();
    },
  },
} satisfies ChartConfig;
