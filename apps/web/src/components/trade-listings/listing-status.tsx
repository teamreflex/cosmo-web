import type { Picks } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import {
  objektName,
  posterName,
  wantedObjektCount,
} from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { offeredTokenRefusalsQuery } from "@/lib/queries/trade-listings";
import type {
  ListingClaim,
  TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type PropsWithChildren, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import Countdown from "../misc/countdown";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import { SideHeadingSkeleton } from "./side-heading";

/**
 * The header's status: a line saying where the listing stands, and below it
 * a quieter line of detail. It right-aligns beside the title on wide
 * screens and sits under it, left-aligned, once the header wraps.
 */
export function Status({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 basis-70 flex-col gap-1 text-sm xl:items-end xl:text-right",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The quieter second line of a status.
 */
export function StatusDetail({
  id,
  children,
}: PropsWithChildren<{ id?: string }>) {
  return (
    <p id={id} className="text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * A claimed listing seen by anyone but its two parties: how long the trade
 * on it has left, unless a dispute froze it.
 */
export function OnlookerStatus({ deadlineAt }: { deadlineAt: Date | null }) {
  return (
    <Status>
      <span className="text-muted-foreground">
        {deadlineAt === null ? (
          m.listing_detail_onlooker_untimed()
        ) : (
          <ParaglideMessage
            message={m.listing_detail_onlooker}
            inputs={{ left: "" }}
            markup={{ time: () => <Countdown deadline={deadlineAt} /> }}
          />
        )}
      </span>
    </Status>
  );
}

/**
 * The claimer's own claimed listing: how long their trade has left and what
 * to send to whom, or that a dispute froze it.
 */
export function ClaimerStatus({
  listing,
  deadlineAt,
}: {
  listing: TradeListing;
  deadlineAt: Date | null;
}) {
  return (
    <Status>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <span className="font-semibold">
          {m.listing_detail_claimer_title()}
        </span>
        {deadlineAt !== null && (
          <span className="text-xs text-muted-foreground">
            <ParaglideMessage
              message={m.listing_detail_time_left}
              inputs={{ left: "" }}
              markup={{ time: () => <Countdown deadline={deadlineAt} /> }}
            />
          </span>
        )}
      </div>
      <StatusDetail>
        {deadlineAt === null
          ? m.listing_detail_claim_disputed()
          : m.listing_detail_claimer_body({
              count: wantedObjektCount(listing.wants),
              poster: posterName(listing),
              appName: env.VITE_APP_NAME,
            })}
      </StatusDetail>
    </Status>
  );
}

export function ViewerErrorStatus() {
  return (
    <Status>
      <p className="text-muted-foreground">{m.listing_detail_viewer_error()}</p>
    </Status>
  );
}

export function StatusSkeleton() {
  return (
    <Status>
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-3.5 w-64" />
    </Status>
  );
}

/**
 * The asking half while the viewer's side of the listing loads.
 */
export function WantsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SideHeadingSkeleton />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}

/**
 * Why the page changed under the viewer's last Accept: someone else
 * accepted first, or the poster changed the listing.
 */
export type Notice = "lost_race" | "updated";

/**
 * The full-width strip under the header that says so.
 */
export function NoticeStrip({ notice }: { notice: Notice }) {
  return notice === "lost_race" ? (
    <Alert role="status">
      <IconInfoCircle />
      <AlertTitle>{m.listing_detail_lost_race_title()}</AlertTitle>
      <AlertDescription>{m.listing_detail_lost_race_body()}</AlertDescription>
    </Alert>
  ) : (
    <Alert role="status">
      <IconRefresh />
      <AlertTitle>{m.listing_detail_updated_title()}</AlertTitle>
      <AlertDescription>{m.listing_detail_updated_body()}</AlertDescription>
    </Alert>
  );
}

/**
 * The poster's own claimed listing: who accepted it and how long their trade
 * has left, or that a dispute froze it. Edit and Withdraw stay disabled
 * while it runs, each described by why.
 */
export function PosterClaimedStatus({
  claim,
  editReasonId,
  withdrawReasonId,
}: {
  claim: ListingClaim;
  editReasonId: string;
  withdrawReasonId: string;
}) {
  const { username, deadlineAt } = claim;
  const user = ({ children }: PropsWithChildren) => (
    <span className="font-semibold">{children}</span>
  );

  return (
    <Status>
      <span>
        {deadlineAt === null ? (
          username === null ? (
            m.listing_detail_poster_claimed_someone_untimed()
          ) : (
            <ParaglideMessage
              message={m.listing_detail_poster_claimed_untimed}
              inputs={{ username: `@${username}` }}
              markup={{ user }}
            />
          )
        ) : username === null ? (
          <ParaglideMessage
            message={m.listing_detail_poster_claimed_someone}
            inputs={{ left: "" }}
            markup={{ time: () => <Countdown deadline={deadlineAt} /> }}
          />
        ) : (
          <ParaglideMessage
            message={m.listing_detail_poster_claimed}
            inputs={{ username: `@${username}`, left: "" }}
            markup={{
              user,
              time: () => <Countdown deadline={deadlineAt} />,
            }}
          />
        )}
      </span>
      <StatusDetail>
        {deadlineAt === null
          ? m.listing_detail_claim_disputed()
          : m.listing_detail_poster_claimed_body()}
      </StatusDetail>
      <span id={editReasonId} className="sr-only">
        {m.listing_composer_edit_claimed()}
      </span>
      <span id={withdrawReasonId} className="sr-only">
        {m.listing_detail_withdraw_claimed()}
      </span>
    </Status>
  );
}

/**
 * The strip under the header of the poster's own open listing while their
 * side stops every claim, naming each objekt that's the cause.
 */
export function BlockedAlert({ listing }: { listing: TradeListing }) {
  const fallback = <p>{m.listing_detail_poster_blocked_body()}</p>;

  return (
    <Alert
      role="status"
      className="border-amber-500/40 *:[svg]:text-amber-700 dark:*:[svg]:text-amber-500"
    >
      <IconAlertTriangle />
      <AlertTitle>{m.listing_detail_poster_blocked_title()}</AlertTitle>
      <AlertDescription>
        <ErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <BlockedReasons listing={listing} />
          </Suspense>
        </ErrorBoundary>
        <p>{m.listing_detail_poster_blocked_fix()}</p>
      </AlertDescription>
    </Alert>
  );
}

function BlockedReasons({ listing }: { listing: TradeListing }) {
  const { data: refusals } = useSuspenseQuery(
    offeredTokenRefusalsQuery(listing.items.map((item) => item.tokenId)),
  );
  const reasons = listing.items.flatMap((item) => {
    const reason = refusals.get(item.tokenId);
    return reason === undefined
      ? []
      : [
          formatTokenRefusal(reason, {
            objekt: objektName(item.collection, item.attributes),
            serial: item.serial ?? 0,
          }),
        ];
  });

  return reasons.length > 0 ? (
    <ul>
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  ) : (
    <p>{m.listing_detail_poster_blocked_body()}</p>
  );
}

/**
 * How far the picks get: how many objekts the viewer is short of filling
 * the listing, or how many of its objekts they've picked, ticked once the
 * picks fit.
 */
export function PickProgress({ picks }: { picks: Picks }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium tabular-nums",
        picks.valid
          ? "text-teal-700 dark:text-teal-500"
          : "text-amber-700 dark:text-amber-400",
      )}
    >
      {picks.valid && <IconCircleCheck className="size-3.5" />}
      {picks.short > 0
        ? m.listing_detail_short({ count: picks.short })
        : m.listing_detail_picked({
            picked: picks.pickedCount,
            count: picks.total,
          })}
    </span>
  );
}
