import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import { formatDay } from "@/lib/client/time";
import type { PriceHistoryPoint } from "@/lib/universal/objekts";
import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  points: PriceHistoryPoint[];
};

// below this many points the lines are too short to read without markers
const SPARSE_POINTS = 8;

/**
 * Floor (area) and median (dashed line) in USD over listing counts (bars on
 * their own hidden axis, squashed into the bottom quarter of the plot).
 */
export default function PriceHistoryChart({ points }: Props) {
  // colons in a generated id break the url(#id) the fill references
  const gradientId = `floor-${useId().replace(/:/g, "")}`;
  const { formatUsd } = useDisplayCurrency();

  const config = {
    floorUsd: {
      label: m.objekt_metadata_history_floor(),
      color: "var(--color-cosmo-text)",
    },
    medianUsd: {
      label: m.objekt_metadata_market_price(),
      color: "var(--color-muted-foreground)",
    },
    listingCount: {
      label: m.objekt_metadata_listing_count(),
      color: "var(--color-muted)",
    },
  } satisfies ChartConfig;

  const dot =
    points.length < SPARSE_POINTS
      ? { r: 3, strokeWidth: 2, fill: "var(--color-background)" }
      : false;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-48 [&_.recharts-cartesian-axis-tick_text]:font-mono"
    >
      <ComposedChart data={points} margin={{ left: 0, right: 8, top: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-floorUsd)"
              stopOpacity={0.28}
            />
            <stop
              offset="100%"
              stopColor="var(--color-floorUsd)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              className="w-44"
              sort={false}
              // the label is the x-axis value: the row's `date` string
              labelFormatter={(_, payload) =>
                formatDay(payload[0]?.payload.date ?? "")
              }
              formatter={(value, name, item) => (
                <>
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex flex-1 items-center justify-between leading-none">
                    <span className="text-muted-foreground">
                      {seriesLabel(config, name ?? "")}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {name === "listingCount"
                        ? Number(value)
                        : formatUsd(Number(value))}
                    </span>
                  </div>
                </>
              )}
            />
          }
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={40}
          tickFormatter={formatDay}
        />
        <YAxis
          yAxisId="usd"
          width={52}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
          // keeps the lines clear of the listing bars along the bottom
          padding={{ top: 4, bottom: 40 }}
          tickFormatter={formatUsd}
        />
        {/* hidden, but still on the right so it doesn't reserve left gutter */}
        <YAxis
          yAxisId="count"
          orientation="right"
          hide
          domain={[0, (max: number) => max * 4]}
        />

        <Area
          yAxisId="usd"
          dataKey="floorUsd"
          type="monotone"
          stroke="var(--color-floorUsd)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={dot}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          yAxisId="usd"
          dataKey="medianUsd"
          type="monotone"
          stroke="var(--color-medianUsd)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={dot}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
        {/* last so the tooltip lists prices before the count */}
        <Bar
          yAxisId="count"
          dataKey="listingCount"
          fill="var(--color-listingCount)"
          maxBarSize={10}
          radius={1}
          isAnimationActive={false}
        />

        <ChartLegend
          content={<ChartLegendContent className="justify-start pt-2" />}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function seriesLabel(config: ChartConfig, name: string | number) {
  return config[String(name)]?.label;
}
