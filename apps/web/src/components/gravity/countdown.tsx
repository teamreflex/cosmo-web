import { m } from "@/i18n/messages";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { intervalToDuration } from "date-fns";
import { Ticker } from "../misc/countdown";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

export default function Countdown({
  className,
  pollStartDate,
  pollEndDate,
  gravityEndDate,
}: Props) {
  return (
    <Ticker fallback={<CountdownSkeleton className={className} />}>
      {(now) => {
        const state = getCountdownState(
          now,
          pollStartDate,
          pollEndDate,
          gravityEndDate,
        );
        const variant =
          state.type === "starts_in"
            ? "gravity-starts"
            : state.type === "voting_ends"
              ? "gravity-voting"
              : "gravity-counting";

        return (
          <Badge variant={variant} className={cn("gap-1.5", className)}>
            {state.type === "starts_in" && (
              <>
                <span className="font-semibold">{m.gravity_starts_in()}</span>
                <span className="font-mono">
                  {calculateTimeLeft(now, state.target)}
                </span>
              </>
            )}
            {state.type === "voting_ends" && (
              <>
                <span className="font-semibold">{m.gravity_voting_ends()}</span>
                <span className="font-mono">
                  {calculateTimeLeft(now, state.target)}
                </span>
              </>
            )}
            {state.type === "counting" && (
              <span className="font-semibold">{m.gravity_counting()}</span>
            )}
          </Badge>
        );
      }}
    </Ticker>
  );
}

function CountdownSkeleton({ className }: PropsWithClassName<object>) {
  return <Skeleton className={cn("h-5 w-32 rounded-full", className)} />;
}

type Props = PropsWithClassName<{
  pollStartDate: Date;
  pollEndDate: Date | null;
  gravityEndDate: Date;
}>;

type CountdownState =
  | { type: "starts_in"; target: Date }
  | { type: "voting_ends"; target: Date }
  | { type: "counting" };

function getCountdownState(
  now: Date,
  pollStartDate: Date,
  pollEndDate: Date | null,
  gravityEndDate: Date,
): CountdownState {
  // If voting hasn't started yet
  if (pollStartDate > now) {
    return { type: "starts_in", target: pollStartDate };
  }

  // If poll end is in the future
  if (pollEndDate && pollEndDate > now) {
    return { type: "voting_ends", target: pollEndDate };
  }

  // Poll ended but gravity still ongoing
  if (gravityEndDate > now) {
    return { type: "counting" };
  }

  // Gravity has ended - shouldn't be shown in hero
  return { type: "counting" };
}

function calculateTimeLeft(now: Date, endDate: Date) {
  if (endDate <= now) {
    return "00:00:00";
  }

  const duration = intervalToDuration({
    start: now,
    end: endDate,
  });

  const hoursNum = (duration.hours ?? 0) + (duration.days ?? 0) * 24;
  const hours = hoursNum.toString().padStart(2, "0");
  const minutes = (duration.minutes ?? 0).toString().padStart(2, "0");
  const seconds = (duration.seconds ?? 0).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}
