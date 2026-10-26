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
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconFlag,
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
 * a quieter line of detail. From tablet width it right-aligns at the
 * header's far end; phones stack it under the title, left-aligned.
 */
export function Status({ children }: PropsWithChildren) {
  return (
    <div className="flex min-w-0 flex-1 basis-70 flex-col gap-1 text-sm md:items-end md:text-right">
      {children}
    </div>
  );
}

/**
 * The claimer's own claimed listing: how long their trade has left and what
 * to send to whom, or that a dispute froze it.
 */
export function ClaimerAlert({
  listing,
  deadlineAt,
}: {
  listing: TradeListing;
  deadlineAt: Date | null;
}) {
  return (
    <Alert role="status" variant={deadlineAt === null ? "warning" : "success"}>
      {deadlineAt === null ? <IconFlag /> : <IconCircleCheck />}
      <AlertTitle className="flex flex-wrap items-baseline gap-x-2">
        {m.listing_detail_claimer_title()}
        {deadlineAt !== null && (
          <span className="font-normal text-muted-foreground">
            <ParaglideMessage
              message={m.listing_detail_time_left}
              inputs={{ left: "" }}
              markup={{ time: () => <Countdown deadline={deadlineAt} /> }}
            />
          </span>
        )}
      </AlertTitle>
      <AlertDescription>
        {deadlineAt === null
          ? m.listing_detail_claim_disputed()
          : m.listing_detail_claimer_body({
              count: wantedObjektCount(listing.wants),
              poster: posterName(listing),
              appName: env.VITE_APP_NAME,
            })}
      </AlertDescription>
    </Alert>
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
 * has left, or that a dispute froze it.
 */
export function PosterClaimedAlert({ claim }: { claim: ListingClaim }) {
  const { username, deadlineAt } = claim;
  const user = ({ children }: PropsWithChildren) => (
    <span className="font-semibold">{children}</span>
  );

  return (
    <Alert role="status" variant={deadlineAt === null ? "warning" : "success"}>
      {deadlineAt === null ? <IconFlag /> : <IconCircleCheck />}
      <AlertTitle>
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
      </AlertTitle>
      <AlertDescription>
        {deadlineAt === null
          ? m.listing_detail_claim_disputed()
          : m.listing_detail_poster_claimed_body()}
      </AlertDescription>
    </Alert>
  );
}

/**
 * The strip under the header of the poster's own open listing while their
 * side stops every claim, naming each objekt that's the cause.
 */
export function BlockedAlert({ listing }: { listing: TradeListing }) {
  const fallback = <p>{m.listing_detail_poster_blocked_body()}</p>;

  return (
    <Alert role="status" variant="warning">
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
