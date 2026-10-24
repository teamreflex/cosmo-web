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
import { useId, useState } from "react";
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
import { ApproxPrice } from "../price-display";

type Props = {
  points: PriceHistoryPoint[];
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * A snapshot with its prices in the display currency.
 */
type Snapshot = {
  date: string;
  floor: number;
  median: number;
  listingCount: number;
};

/**
 * One chart row per snapshot on a time axis, prices in the display currency.
 * Days without a snapshot get a row with only a gap value, which breaks the
 * solid series there and carries the floor across the gap as a faded dashed
 * line instead. Gaps alternate between two series, so the solid stretch
 * between two gaps never gets a dashed line drawn over it.
 */
type Row = {
  t: number;
  floor: number | null;
  median: number | null;
  listingCount: number | null;
  gapEven: number | null;
  gapOdd: number | null;
};

type GapKey = "gapEven" | "gapOdd";

/**
 * Floor (area) and median (dashed line) over listing counts (bars on their
 * own hidden axis, squashed into the bottom quarter of the plot), on a time
 * axis running up to today so missing days show as gaps. Prices are converted
 * before plotting so the axis picks round ticks in the display currency.
 */
export default function PriceHistoryChart({ points }: Props) {
  // colons in a generated id break the url(#id) the fill references
  const gradientId = `floor-${useId().replace(/:/g, "")}`;
  const { fromUsd, format } = useDisplayCurrency();
  const [today] = useState(() => dayStart(new Date().toISOString()));
  const rows = toRows(
    points.map((point) => ({
      date: point.date,
      floor: fromUsd(point.floorUsd),
      median: fromUsd(point.medianUsd),
      listingCount: point.listingCount,
    })),
    today,
  );
  const start = rows[0]?.t ?? 0;
  const end = rows[rows.length - 1]?.t ?? 0;
  const gapKeys = (["gapEven", "gapOdd"] satisfies GapKey[]).filter((key) =>
    rows.some((row) => row[key] !== null),
  );

  const config = {
    floor: {
      label: m.objekt_metadata_history_floor(),
      color: "var(--color-cosmo-text)",
    },
    median: {
      label: m.objekt_metadata_market_price(),
      color: "var(--color-muted-foreground)",
    },
    listingCount: {
      label: m.objekt_metadata_listing_count(),
      color: "var(--color-muted)",
    },
    gapEven: {
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
      rows[index]?.floor != null &&
      rows[index - 1]?.floor == null &&
      rows[index + 1]?.floor == null;
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
              stopColor="var(--color-floor)"
              stopOpacity={0.28}
            />
            <stop
              offset="100%"
              stopColor="var(--color-floor)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload, label }) =>
            // gap rows have no snapshot to show
            rows.some((row) => row.t === label && row.floor !== null) ? (
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
                        {name === "listingCount" ? (
                          Number(value)
                        ) : (
                          <ApproxPrice price={format(Number(value))} />
                        )}
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
          yAxisId="price"
          // sized to the labels, which vary with the viewer's currency
          width="auto"
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
          // keeps the lines clear of the listing bars along the bottom
          padding={{ top: 4, bottom: 40 }}
          tickFormatter={(amount: number) => format(amount).text}
        />
        {/* hidden, but still on the right so it doesn't reserve left gutter */}
        <YAxis
          yAxisId="count"
          orientation="right"
          hide
          domain={[0, (max: number) => max * 4]}
        />

        <Area
          yAxisId="price"
          dataKey="floor"
          type="monotone"
          stroke="var(--color-floor)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={dot}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          yAxisId="price"
          dataKey="median"
          type="monotone"
          stroke="var(--color-median)"
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
        {gapKeys.map((key, i) => (
          <Line
            key={key}
            yAxisId="price"
            dataKey={key}
            type="linear"
            stroke="var(--color-gapEven)"
            strokeWidth={2}
            strokeDasharray="2 5"
            dot={false}
            activeDot={false}
            tooltipType="none"
            // one legend entry covers both
            legendType={i === 0 ? "line" : "none"}
            isAnimationActive={false}
          />
        ))}

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
function toRows(snapshots: Snapshot[], today: number) {
  const rows: Row[] = [];
  let prev: { row: Row; floor: number } | undefined;
  let gaps = 0;

  function nextGapKey(): GapKey {
    gaps += 1;
    return gaps % 2 === 1 ? "gapEven" : "gapOdd";
  }

  for (const { date, ...values } of snapshots) {
    const row: Row = {
      t: dayStart(date),
      ...values,
      gapEven: null,
      gapOdd: null,
    };
    if (prev !== undefined && row.t - prev.row.t > DAY) {
      const key = nextGapKey();
      const slope = (values.floor - prev.floor) / (row.t - prev.row.t);
      prev.row[key] = prev.floor;
      rows.push(gapRow(prev.row.t + DAY, key, prev.floor + slope * DAY));
      row[key] = values.floor;
    }
    rows.push(row);
    prev = { row, floor: values.floor };
  }

  if (prev !== undefined && today - prev.row.t > DAY) {
    const key = nextGapKey();
    prev.row[key] = prev.floor;
    rows.push(gapRow(today, key, prev.floor));
  }

  return rows;
}

function gapRow(t: number, key: GapKey, value: number): Row {
  return {
    t,
    floor: null,
    median: null,
    listingCount: null,
    gapEven: null,
    gapOdd: null,
    [key]: value,
  };
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
