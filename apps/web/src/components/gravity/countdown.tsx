import { m } from "@/i18n/messages";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { ClientOnly } from "@tanstack/react-router";
import { intervalToDuration, isFuture } from "date-fns";
import { useState } from "react";
import { useInterval } from "usehooks-ts";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

export default function Countdown({
  className,
  pollStartDate,
  pollEndDate,
  gravityEndDate,
}: Props) {
  return (
    <ClientOnly fallback={<CountdownSkeleton className={className} />}>
      <CountdownInner
        className={className}
        pollStartDate={pollStartDate}
        pollEndDate={pollEndDate}
        gravityEndDate={gravityEndDate}
      />
    </ClientOnly>
  );
}

function CountdownInner({
  className,
  pollStartDate,
  pollEndDate,
  gravityEndDate,
}: Props) {
  const [state, setState] = useState(() =>
    getCountdownState(pollStartDate, pollEndDate, gravityEndDate),
  );
  const [timeLeft, setTimeLeft] = useState(() =>
    state.type === "counting" ? null : calculateTimeLeft(state.target),
  );

  useInterval(() => {
    const newState = getCountdownState(
      pollStartDate,
      pollEndDate,
      gravityEndDate,
    );
    setState(newState);
    if (newState.type !== "counting") {
      setTimeLeft(calculateTimeLeft(newState.target));
    }
  }, 1000);

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
          <span className="font-mono">{timeLeft}</span>
        </>
      )}
      {state.type === "voting_ends" && (
        <>
          <span className="font-semibold">{m.gravity_voting_ends()}</span>
          <span className="font-mono">{timeLeft}</span>
        </>
      )}
      {state.type === "counting" && (
        <span className="font-semibold">{m.gravity_counting()}</span>
      )}
    </Badge>
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
  pollStartDate: Date,
  pollEndDate: Date | null,
  gravityEndDate: Date,
): CountdownState {
  // If voting hasn't started yet
  if (isFuture(pollStartDate)) {
    return { type: "starts_in", target: pollStartDate };
  }

  // If poll end is in the future
  if (pollEndDate && isFuture(pollEndDate)) {
    return { type: "voting_ends", target: pollEndDate };
  }

  // Poll ended but gravity still ongoing
  if (isFuture(gravityEndDate)) {
    return { type: "counting" };
  }

  // Gravity has ended - shouldn't be shown in hero
  return { type: "counting" };
}

function calculateTimeLeft(endDate: Date) {
  const now = new Date();
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
