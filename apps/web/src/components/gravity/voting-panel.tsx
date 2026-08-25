import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { IconLock, IconQuestionMark } from "@tabler/icons-react";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";

/** Placeholder rows standing in for the race that starts once counting does. */
const SEALED_ROWS = 6;

type Props = {
  /** When the poll closes and COSMO starts revealing picks. */
  countingStartsAt: string;
};

/** The main column while voting: totals stay sealed, so the race is shown as an outline of itself, dissolving into the page. */
export default function VotingPanel(props: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* the recent votes card sits alongside this one, and the two share a height */}
      <div className="flex min-h-36 flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card p-6 text-center">
        <IconLock className="size-6 text-muted-foreground" />

        <p className="text-sm font-medium">{m.gravity_votes_sealed()}</p>

        {/* div rather than p: the skeleton fallback is a div, invalid inside p */}
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-muted-foreground">
          <span>{m.gravity_totals_reveal()}</span>
          <span aria-hidden>·</span>
          {/* the date renders in the viewer's timezone, so it waits for the client */}
          <ClientOnly fallback={<Skeleton className="h-3 w-28 rounded-full" />}>
            <span className="font-mono">
              {format(new Date(props.countingStartsAt), "MMM d, h:mm a")}
            </span>
          </ClientOnly>
        </div>
      </div>

      <div className="relative">
        <div className="flex flex-col px-3">
          {Array.from({ length: SEALED_ROWS }, (_, index) => (
            <SealedRow key={index} index={index} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-background" />
      </div>
    </div>
  );
}

function SealedRow({ index }: { index: number }) {
  return (
    <div className="flex h-10 items-center gap-2.5">
      <span className="w-5 shrink-0 text-center font-mono text-sm text-muted-foreground">
        {index + 1}
      </span>

      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <IconQuestionMark className="size-4 text-muted-foreground" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-muted"
            style={{ width: `${100 - index * 14}%` }}
          />
        </div>
      </div>
    </div>
  );
}
