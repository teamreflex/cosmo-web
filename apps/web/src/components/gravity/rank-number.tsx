import { rankColor } from "@/lib/client/gravity/colors";
import { cn } from "@/lib/utils";

type Props = {
  /** 1-based position. */
  rank: number;
  className?: string;
};

/**
 * A position in a race or leaderboard, gold/silver/bronze on the podium.
 */
export default function RankNumber(props: Props) {
  const color = rankColor(props.rank);

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        color === undefined && "text-muted-foreground",
        props.className,
      )}
      style={color === undefined ? undefined : { color }}
    >
      {props.rank}
    </span>
  );
}
