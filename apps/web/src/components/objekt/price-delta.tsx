import { cn } from "@/lib/utils";

type Props = {
  from: number;
  to: number;
};

/**
 * Percentage change between two prices as a green up or red down pill, or a
 * neutral one when it rounds to no change.
 */
export default function PriceDelta({ from, to }: Props) {
  const percent = ((to - from) / from) * 100;
  const rounded = Math.abs(percent).toFixed(1);
  const direction = rounded === "0.0" ? "flat" : percent > 0 ? "up" : "down";

  return (
    <span
      className={cn(
        "rounded-sm px-1.5 font-mono text-xxs font-semibold whitespace-nowrap tabular-nums",
        TONES[direction],
      )}
    >
      {ARROWS[direction]}
      {rounded}%
    </span>
  );
}

const TONES = {
  up: "bg-emerald-500/10 text-emerald-500",
  down: "bg-red-500/10 text-red-500",
  flat: "bg-muted text-muted-foreground",
};

const ARROWS = {
  up: "▲ ",
  down: "▼ ",
  flat: "",
};
