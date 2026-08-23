import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { m } from "@/i18n/messages";
import type { SlotCandidateRanking } from "@/lib/client/gravity/slots";
import { cn } from "@/lib/utils";
import { IconCaretDownFilled, IconCaretUpFilled } from "@tabler/icons-react";
import ComoShare from "./como-share";
import RankNumber from "./rank-number";

type Props = {
  row: SlotCandidateRanking;
  /** The candidate's color, ringing the avatar and filling the track bar. */
  color: string;
};

/**
 * One candidate's standing in a slot: position, movement since the last reveal
 * batch, COMO taken, and a bar tracking the slot's leader.
 */
export default function RaceRow(props: Props) {
  const { row } = props;

  return (
    <div
      className="flex h-10 items-center gap-2.5"
      style={{ "--candidate-color": props.color }}
    >
      <div className="flex w-5 shrink-0 flex-col items-center gap-0.5">
        <RankNumber rank={row.rank} className="text-sm leading-none" />
        {row.movement !== null && <Movement change={row.movement.rankChange} />}
      </div>

      <Avatar className="size-8 shrink-0 ring-2 ring-(--candidate-color)">
        <AvatarFallback>{row.candidate.name.charAt(0)}</AvatarFallback>
        <AvatarImage src={row.candidate.imageUrl} alt={row.candidate.name} />
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {row.candidate.name}
          </span>

          <span className="flex shrink-0 items-baseline gap-1.5 text-xs">
            <ComoShare como={row.como} share={row.share} />

            {row.movement !== null && row.movement.como > 0 && (
              <span
                className="font-mono text-cosmo dark:text-cosmo-text"
                title={m.gravity_candidate_delta({
                  amount: row.movement.como.toLocaleString(),
                })}
              >
                +{row.movement.como.toLocaleString()}
              </span>
            )}
          </span>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-(--candidate-color) transition-[width] duration-500"
            style={{ width: `${row.leaderShare * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Positions gained or lost when the last reveal batch landed.
 */
function Movement({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="font-mono text-xxs leading-none text-muted-foreground">
        —
      </span>
    );
  }

  const Caret = change > 0 ? IconCaretUpFilled : IconCaretDownFilled;

  return (
    <span
      className={cn(
        "flex items-center font-mono text-xxs leading-none",
        change > 0 ? "text-green-500" : "text-red-500",
      )}
    >
      <Caret className="size-2.5" />
      {Math.abs(change)}
    </span>
  );
}
