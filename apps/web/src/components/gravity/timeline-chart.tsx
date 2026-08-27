import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import type { ChartSegment, LiveStatus } from "@/lib/client/gravity/types";
import { cn } from "@/lib/utils";
import { addMinutes, format } from "date-fns";
import { useId, useMemo, useState } from "react";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import { ComoAmount } from "./como-share";
import GravityStatus from "./gravity-status";

/**
 * One line's cumulative COMO across the poll, drawn over the bars.
 */
export type TrajectoryLine = {
  key: string;
  label: string;
  color: string;
  /** Runs the line and its swatch between two colors; null draws solid. */
  gradient: readonly [string, string] | null;
  /** One entry per chart segment, null past the reveal frontier. */
  values: (number | null)[];
};

type Props = {
  chartData: ChartSegment[];
  liveStatus: LiveStatus;
  isRefreshing: boolean;
  totalComoUsed: number;
  lines: TrajectoryLine[];
  /** Last segment holding a revealed vote; later segments render dim. */
  frontierSegmentIndex: number;
};

export default function TimelineChart(props: Props) {
  // segment times render in the viewer's timezone, so they wait for the client
  const hydrated = useHydrated();
  // colons in a generated id break the url(#id) the stroke references
  const gradientPrefix = useId().replaceAll(":", "");
  const gradientId = (index: number) => `${gradientPrefix}-line-${index}`;
  // pointing anywhere at the chart pulls the bars back so the lines read clearly
  const [hovered, setHovered] = useState(false);

  const data = useMemo(
    () =>
      props.chartData.map((segment, index) => ({
        ...segment,
        ...Object.fromEntries(
          props.lines.map((line, lineIndex) => [
            lineKey(lineIndex),
            line.values[index] ?? null,
          ]),
        ),
      })),
    [props.chartData, props.lines],
  );

  /**
   * The tooltip takes its heading from the config entry matching the hovered
   * segment's timestamp, which is what the x-axis keys the chart on.
   */
  const config = useMemo(
    (): ChartConfig => ({
      totalTokenAmount: { label: m.chart_como_used() },
      ...Object.fromEntries(
        props.lines.map((line, index) => [
          lineKey(index),
          { label: line.label, color: line.color },
        ]),
      ),
      ...Object.fromEntries(
        props.chartData.map((segment) => [
          segment.timestamp,
          { label: <SegmentHeading segment={segment} /> },
        ]),
      ),
    }),
    [props.chartData, props.lines],
  );

  const ticks = useMemo(
    () =>
      new Map(
        props.chartData.map((segment) => [
          segment.timestamp,
          // compact meridiem: the ticks sit on a 30-minute spacing
          hydrated ? format(new Date(segment.timestamp), "h:mmaaa") : "",
        ]),
      ),
    [props.chartData, hydrated],
  );

  /**
   * Bars are solid up to the frontier and dim past it. Nothing is revealed
   * while voting, so the frontier is how far the votes themselves have got.
   */
  const frontier =
    props.liveStatus === "voting"
      ? lastVotedSegment(props.chartData)
      : props.frontierSegmentIndex;
  // counting with nothing revealed yet pulses the first segment: that is the
  // one currently being counted
  const pulsing =
    props.liveStatus === "live"
      ? Math.max(frontier, 0)
      : props.liveStatus === "voting"
        ? frontier
        : -1;

  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-card p-3 pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {props.liveStatus === "voting" ? (
          <p className="text-xs text-muted-foreground">
            {m.gravity_chart_como_interval()}
          </p>
        ) : (
          <GravityStatus
            liveStatus={props.liveStatus}
            isRefreshing={props.isRefreshing}
          />
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {props.lines.map((line) => (
            <span
              key={line.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="h-0.5 w-3 rounded-full"
                style={{
                  background:
                    line.gradient === null
                      ? line.color
                      : `linear-gradient(90deg, ${line.gradient[0]}, ${line.gradient[1]})`,
                }}
              />
              {line.label}
            </span>
          ))}

          <ComoAmount como={props.totalComoUsed} className="text-xs" />
        </div>
      </div>

      <ChartContainer
        config={config}
        className="aspect-auto h-48 [&_.recharts-cartesian-axis-tick_text]:font-mono"
      >
        <ComposedChart
          data={data}
          margin={{ left: 0, right: 0, top: 4 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <defs>
            {props.lines.flatMap((line, index) =>
              line.gradient === null
                ? []
                : [
                    <linearGradient
                      key={line.key}
                      id={gradientId(index)}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={line.gradient[0]} />
                      <stop offset="100%" stopColor={line.gradient[1]} />
                    </linearGradient>,
                  ],
            )}
          </defs>

          <ChartTooltip
            includeHidden
            content={<ChartTooltipContent indicator="dot" className="w-52" />}
          />

          <XAxis
            dataKey="timestamp"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            minTickGap={48}
            tickFormatter={(value) => ticks.get(value) ?? ""}
          />

          <YAxis yAxisId="segment" hide />
          {/* cumulative totals dwarf the per-segment bars, so lines get their own scale */}
          <YAxis yAxisId="cumulative" hide />

          <Bar
            yAxisId="segment"
            dataKey="totalTokenAmount"
            radius={[4, 4, 0, 0]}
            fill="var(--color-cosmo)"
            tooltipType="none"
            isAnimationActive={false}
            className={cn(
              "transition-opacity duration-300",
              hovered && "opacity-25",
            )}
          >
            {data.map((segment, index) => (
              <Cell
                key={segment.timestamp}
                className={
                  // faster than the default, so the counted segment reads live
                  index === pulsing
                    ? "animate-pulse [animation-duration:1.4s]"
                    : undefined
                }
                fillOpacity={index > frontier ? 0.22 : 1}
              />
            ))}
          </Bar>

          {props.lines.map((line, index) => (
            <Line
              key={line.key}
              yAxisId="cumulative"
              type="monotone"
              dataKey={lineKey(index)}
              stroke={
                line.gradient === null
                  ? line.color
                  : `url(#${gradientId(index)})`
              }
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}

          {props.lines.flatMap((line) => {
            const end = lastPoint(props.chartData, line);
            return end === undefined
              ? []
              : [
                  <ReferenceDot
                    key={line.key}
                    yAxisId="cumulative"
                    x={end.timestamp}
                    y={end.value}
                    r={3}
                    // the dot caps the line, so it takes the gradient's end
                    fill={line.gradient?.[1] ?? line.color}
                    stroke="none"
                  />,
                ];
          })}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

/**
 * Tooltip heading: the segment's half-hour window and the COMO it took.
 */
function SegmentHeading({ segment }: { segment: ChartSegment }) {
  const start = new Date(segment.timestamp);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xxs text-muted-foreground">
        {format(start, "MMM d, h:mm a")} –{" "}
        {format(addMinutes(start, 30), "h:mm a")}
      </span>
      <span className="font-mono text-cosmo dark:text-cosmo-text">
        {m.gravity_chart_segment_como({
          amount: segment.totalTokenAmount.toLocaleString(),
        })}
      </span>
    </div>
  );
}

/**
 * How far the poll has run, taken from the votes rather than the clock.
 */
function lastVotedSegment(chartData: ChartSegment[]) {
  for (let index = chartData.length - 1; index >= 0; index--) {
    if ((chartData[index]?.voteCount ?? 0) > 0) {
      return index;
    }
  }
  return -1;
}

/**
 * Where a line stops, marked with an end dot.
 */
function lastPoint(chartData: ChartSegment[], line: TrajectoryLine) {
  for (let index = line.values.length - 1; index >= 0; index--) {
    const value = line.values[index];
    const segment = chartData[index];
    if (value !== null && value !== undefined && segment !== undefined) {
      return { timestamp: segment.timestamp, value };
    }
  }
  return undefined;
}

/**
 * Data key for a drawn line. Positional rather than the line's own key: a slot
 * or member name is not a safe recharts accessor.
 */
function lineKey(index: number) {
  return `line${index}`;
}
