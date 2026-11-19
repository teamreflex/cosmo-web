import { m } from "@/i18n/messages";
import { timeLeft } from "@/lib/client/time";
import { cn, type PropsWithClassName } from "@/lib/utils";
import { ClientOnly } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useInterval } from "usehooks-ts";

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
 * The time left until `deadline` as "41h 12m", ticking on the client. With
 * `pausedAt` it holds the time that was left then, the same on the server
 * and the client, so it renders straight away.
 */
export default function Countdown({
  deadline,
  pausedAt,
  className,
}: PropsWithClassName<{ deadline: Date; pausedAt?: Date }>) {
  const time = (now: Date) => (
    <time
      dateTime={deadline.toISOString()}
      className={cn("font-mono tabular-nums", className)}
    >
      {m.common_hours_minutes(timeLeft(now, deadline))}
    </time>
  );

  return pausedAt === undefined ? (
    <Ticker
      fallback={
        /**
         * A span, not Skeleton's div, so it can sit inside a paragraph: one
         * line tall and about as wide as "41h 12m" in the countdown's own
         * text size.
         */
        <span
          aria-hidden
          className={cn(
            "inline-block h-[1lh] w-[7ch] animate-pulse rounded-full bg-muted align-top font-mono",
            className,
          )}
        />
      }
    >
      {time}
    </Ticker>
  ) : (
    time(pausedAt)
  );
}
