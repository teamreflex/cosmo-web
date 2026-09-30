import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useId } from "react";

type Props = PropsWithClassName<{
  values: number[];
  label: string;
}>;

const WIDTH = 100;
const HEIGHT = 32;
// keeps the stroke at the extremes from being clipped
const INSET = 2;

/**
 * Bare trend line with a fading fill, stretched to fill its box. Plots values
 * evenly spaced from oldest to newest and needs at least two of them.
 */
export default function PriceSparkline({ values, label, className }: Props) {
  // colons in a generated id break the url(#id) the fill references
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const line = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * WIDTH;
      const y =
        max === min
          ? HEIGHT / 2
          : INSET + ((max - value) / (max - min)) * (HEIGHT - INSET * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join("");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn("h-9 w-full", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-cosmo)" stopOpacity={0.35} />
          <stop offset="1" stopColor="var(--color-cosmo)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${line}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={line}
        fill="none"
        stroke="var(--color-cosmo-text)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
