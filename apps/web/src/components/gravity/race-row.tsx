import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { m } from "@/i18n/messages";
import { candidateLabel } from "@/lib/client/gravity/slots";
import type {
  SlotCandidateMember,
  SlotCandidateRanking,
} from "@/lib/client/gravity/slots";
import { cn } from "@/lib/utils";
import { IconCaretUpFilled } from "@tabler/icons-react";
import ComoShare from "./como-share";
import RankNumber from "./rank-number";

type Props = {
  row: SlotCandidateRanking;
  /** The candidate's color, ringing the avatar and filling the track bar. */
  color: string;
  /** Color for one of a pairing's members, by name. */
  memberColor: (name: string) => string;
};

/**
 * One candidate's standing in a slot: position, movement since the last reveal
 * batch, COMO taken, and a bar tracking the slot's leader.
 */
export default function RaceRow(props: Props) {
  const { row } = props;
  const [first, second] = row.candidate.members;
  const trackColors =
    first !== undefined && second !== undefined
      ? ([
          props.memberColor(first.name),
          props.memberColor(second.name),
        ] as const)
      : null;

  return (
    <div
      className="flex h-10 items-center gap-2.5"
      style={{ "--candidate-color": props.color }}
    >
      <div className="flex w-5 shrink-0 flex-col items-center gap-0.5">
        <RankNumber rank={row.rank} className="text-sm leading-none" />
        {row.movement !== null && <Movement change={row.movement.rankChange} />}
      </div>

      {row.candidate.members.length > 0 ? (
        <Pairing members={row.candidate.members} color={props.memberColor} />
      ) : (
        <Avatar className="size-8 shrink-0 ring-2 ring-(--candidate-color)">
          <AvatarFallback>{row.candidate.name.charAt(0)}</AvatarFallback>
          <AvatarImage src={row.candidate.imageUrl} alt={row.candidate.name} />
        </Avatar>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {candidateLabel(row.candidate)}
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
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${row.leaderShare * 100}%`,
              // a pairing's track runs between its two members' colors
              background:
                trackColors === null
                  ? "var(--candidate-color)"
                  : `linear-gradient(90deg, ${trackColors[0]}, ${trackColors[1]})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A pairing's members, overlapped and ringed in each member's own color so a
 * duo reads as both of them rather than the first letter of its label.
 */
function Pairing(props: {
  members: SlotCandidateMember[];
  color: (name: string) => string;
}) {
  return (
    <div className="flex shrink-0 items-center">
      {props.members.map((member, index) => (
        <Avatar
          key={member.name}
          className={cn(
            "size-8 ring-2 ring-(--member-color)",
            // overlap the tail of the pairing, keeping the row's height
            index > 0 && "-ml-3",
          )}
          style={{ "--member-color": props.color(member.name) }}
        >
          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
          <AvatarImage src={member.imageUrl} alt={member.name} />
        </Avatar>
      ))}
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

  return (
    <span
      className={cn(
        "flex items-center font-mono text-xs leading-none",
        change > 0 ? "text-green-500" : "text-red-500",
      )}
    >
      <IconCaretUpFilled
        className={cn("size-2.5", change < 0 && "rotate-180")}
      />
      {Math.abs(change)}
    </span>
  );
}
