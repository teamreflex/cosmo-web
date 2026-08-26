import type {
  CosmoOngoingGravity,
  CosmoPastGravity,
} from "@apollo/cosmo/types/gravity";
import { ClientOnly } from "@tanstack/react-router";
import { format, isSameYear } from "date-fns";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";
import GravityTypeBadge from "./gravity-type-badge";

type Props = {
  gravity: CosmoOngoingGravity | CosmoPastGravity;
  /** Live detail appended to the meta line, such as votes cast while voting. */
  meta?: ReactNode;
  /** Per-state detail on the right: countdown, reveal progress or completion. */
  status?: ReactNode;
};

export default function GravityHeader(props: Props) {
  const start = new Date(props.gravity.entireStartDate);
  const end = new Date(props.gravity.entireEndDate);

  return (
    <div className="flex flex-col gap-1 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold sm:text-[1.375rem]">
            {props.gravity.title}
          </h1>
          <GravityTypeBadge type={props.gravity.type} />
        </div>

        {props.status}
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        {/* dates render in the viewer's timezone, so they wait for the client */}
        <ClientOnly fallback={<Skeleton className="h-5 w-72 rounded-full" />}>
          <span>{formatRange(start, end)}</span>
        </ClientOnly>

        {props.meta !== undefined && (
          <>
            <Separator />
            {props.meta}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Header shape while the gravity itself is still loading.
 */
export function GravityHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <Skeleton className="h-7 w-64 rounded-md" />
      <Skeleton className="h-4 w-72 rounded-full" />
    </div>
  );
}

function Separator() {
  return <span aria-hidden>·</span>;
}

/**
 * Span of the whole gravity, dropping the repeated year.
 */
function formatRange(start: Date, end: Date) {
  const from = isSameYear(start, end)
    ? format(start, "MMM d, h:mm a")
    : format(start, "MMM d, yyyy, h:mm a");
  return `${from} – ${format(end, "MMM d, yyyy, h:mm a")}`;
}
