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
import {
  type PriceHistoryPoint,
  SPARSE_PRICE_HISTORY,
} from "@/lib/universal/objekts";
import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Dot,
  type DotItemDotProps,
  Line,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  points: PriceHistoryPoint[];
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * One chart row per snapshot on a time axis. Days without a snapshot get a
 * row with only `gapUsd`, which breaks the solid series there and carries the
 * floor across the gap as a faded dashed line instead.
 */
type Row = {
  t: number;
  floorUsd: number | null;
  medianUsd: number | null;
  listingCount: number | null;
  gapUsd: number | null;
};

/**
 * Floor (area) and median (dashed line) in USD over listing counts (bars on
 * their own hidden axis, squashed into the bottom quarter of the plot), on a
 * time axis running up to today so missing days show as gaps.
 */
export default function PriceHistoryChart({ points }: Props) {
  // colons in a generated id break the url(#id) the fill references
  const gradientId = `floor-${useId().replace(/:/g, "")}`;
  const { formatUsd } = useDisplayCurrency();
  const rows = toRows(points, dayStart(new Date().toISOString()));
  const start = rows[0]?.t ?? 0;
  const end = rows[rows.length - 1]?.t ?? 0;
  const hasGaps = rows.some((row) => row.gapUsd !== null);

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
    gapUsd: {
      label: m.objekt_metadata_history_gap(),
      color: "color-mix(in oklab, var(--color-cosmo-text) 45%, transparent)",
    },
  } satisfies ChartConfig;

  /**
   * Every point when there are few, otherwise only those cut off by gaps on
   * both sides, which would have no line to show them.
   */
  function dot({ index, cx, cy, stroke }: DotItemDotProps) {
    const isolated =
      rows[index]?.floorUsd != null &&
      rows[index - 1]?.floorUsd == null &&
      rows[index + 1]?.floorUsd == null;
    if (points.length >= SPARSE_PRICE_HISTORY && !isolated) return null;
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={3}
        stroke={stroke}
        strokeWidth={2}
        fill="var(--color-background)"
      />
    );
  }

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-48 [&_.recharts-cartesian-axis-tick_text]:font-mono"
    >
      <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 4 }}>
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
          content={({ active, payload, label }) =>
            // gap rows have no snapshot to show
            rows.some((row) => row.t === label && row.floorUsd !== null) ? (
              <ChartTooltipContent
                active={active}
                payload={payload}
                className="w-44"
                sort={false}
                labelFormatter={() => formatDay(isoDay(Number(label)))}
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
            ) : null
          }
        />

        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          // a lone snapshot sits in the middle of a three-day window
          domain={start === end ? [start - DAY, end + DAY] : [start, end]}
          ticks={dayTicks(start, end)}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={24}
          // keeps the first and last bars from being clipped in half
          padding={{ left: 6, right: 6 }}
          tickFormatter={(t: number) => formatDay(isoDay(t))}
        />
        <YAxis
          yAxisId="usd"
          // sized to the labels, which vary with the viewer's currency
          width="auto"
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
        {/* after the prices so the tooltip lists them before the count */}
        <Bar
          yAxisId="count"
          dataKey="listingCount"
          fill="var(--color-listingCount)"
          maxBarSize={10}
          radius={1}
          isAnimationActive={false}
        />
        {hasGaps && (
          <Line
            yAxisId="usd"
            dataKey="gapUsd"
            type="linear"
            stroke="var(--color-gapUsd)"
            strokeWidth={2}
            strokeDasharray="2 5"
            dot={false}
            activeDot={false}
            tooltipType="none"
            isAnimationActive={false}
          />
        )}

        <ChartLegend
          // in series order rather than by key
          itemSorter={null}
          content={
            <ChartLegendContent className="flex-wrap justify-start gap-y-1 pt-2 [&>div]:whitespace-nowrap" />
          }
        />
      </ComposedChart>
    </ChartContainer>
  );
}

/**
 * Chart rows for the snapshots, with a gap row after each run of days and,
 * when the latest snapshot is older than yesterday, one for today.
 */
function toRows(points: PriceHistoryPoint[], today: number) {
  const rows: Row[] = [];
  let prev: { row: Row; floorUsd: number } | undefined;

  for (const { date, ...values } of points) {
    const row: Row = { t: dayStart(date), ...values, gapUsd: null };
    if (prev !== undefined && row.t - prev.row.t > DAY) {
      const slope = (values.floorUsd - prev.floorUsd) / (row.t - prev.row.t);
      prev.row.gapUsd = prev.floorUsd;
      rows.push(gapRow(prev.row.t + DAY, prev.floorUsd + slope * DAY));
      row.gapUsd = values.floorUsd;
    }
    rows.push(row);
    prev = { row, floorUsd: values.floorUsd };
  }

  if (prev !== undefined && today - prev.row.t > DAY) {
    prev.row.gapUsd = prev.floorUsd;
    rows.push(gapRow(today, prev.floorUsd));
  }

  return rows;
}

function gapRow(t: number, gapUsd: number): Row {
  return { t, floorUsd: null, medianUsd: null, listingCount: null, gapUsd };
}

/**
 * Up to five ticks on whole days, evenly spread from the first to the last.
 */
function dayTicks(start: number, end: number) {
  const days = Math.round((end - start) / DAY);
  const count = Math.min(5, days + 1);
  if (count < 2) return [start];
  return Array.from(
    { length: count },
    (_, i) => start + Math.round((i * days) / (count - 1)) * DAY,
  );
}

/**
 * Midnight UTC of a `YYYY-MM-DD` date (or an ISO timestamp's date).
 */
function dayStart(date: string) {
  return Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
}

function isoDay(t: number) {
  return new Date(t).toISOString().slice(0, 10);
}

function seriesLabel(config: ChartConfig, name: string | number) {
  return config[String(name)]?.label;
}
