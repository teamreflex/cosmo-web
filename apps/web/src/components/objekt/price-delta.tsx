import { cn } from "@/lib/utils";

type Props = {
  from: number;
  to: number;
};

/**
 * Percentage change between two prices as a green up or red down pill.
 */
export default function PriceDelta({ from, to }: Props) {
  const percent = ((to - from) / from) * 100;
  const up = percent >= 0;

  return (
    <span
      className={cn(
        "rounded-sm px-1.5 font-mono text-xxs font-semibold whitespace-nowrap tabular-nums",
        up
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-red-500/10 text-red-500",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}
