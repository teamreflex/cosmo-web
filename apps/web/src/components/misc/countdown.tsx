import { m } from "@/i18n/messages";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { ClientOnly } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useInterval } from "usehooks-ts";
import { Skeleton } from "../ui/skeleton";

type TickerProps = {
  fallback: ReactNode;
  children: (now: Date) => ReactNode;
};

/**
 * Renders `children` with the current time, once a second. The server and
 * the hydration pass render `fallback`, since their clocks differ from the
 * browser's.
 */
export function Ticker({ fallback, children }: TickerProps) {
  return (
    <ClientOnly fallback={fallback}>
      <TickerInner>{children}</TickerInner>
    </ClientOnly>
  );
}

function TickerInner({ children }: Pick<TickerProps, "children">) {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 1000);
  return children(now);
}

/**
 * Whole hours and minutes from `now` until `deadline`, held at zero once it
 * has passed.
 */
function timeLeft(now: Date, deadline: Date) {
  const minutes = Math.max(
    0,
    Math.floor((deadline.getTime() - now.getTime()) / 60_000),
  );
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/**
 * The time left until `deadline` as "41h 12m", ticking on the client.
 */
export default function Countdown({
  deadline,
  className,
}: PropsWithClassName<{ deadline: Date }>) {
  return (
    <Ticker
      fallback={<Skeleton className="inline-block h-4 w-14 rounded-full" />}
    >
      {(now) => (
        <time
          dateTime={deadline.toISOString()}
          className={cn("font-mono tabular-nums", className)}
        >
          {m.common_hours_minutes(timeLeft(now, deadline))}
        </time>
      )}
    </Ticker>
  );
}
