import { m } from "@/i18n/messages";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import { objektName, posterName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { offeredTokenRefusalsQuery } from "@/lib/queries/trade-listings";
import {
  type EndedOfferStatus,
  type ListingFeedItem,
  poolItems,
  takenPick,
  type TradeListing,
  type TradeRatio,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { OFFER_WINDOW } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconArrowsExchange,
  IconClock,
  IconFlag,
  IconHourglassEmpty,
  IconInfoCircle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  type PropsWithChildren,
  type ReactNode,
  Suspense,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import Countdown, { Ticker } from "../misc/countdown";
import OfferActionDialog from "../trades/offer-action-dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button, buttonVariants } from "../ui/button";
import ObjektStrip from "./objekt-strip";

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
 * A card for a trade or an offer from the listing, under the header for
 * the viewer with one and on the poster's Offers tab: an icon, a title and
 * any detail beside it, a time at the far end, the body, then the actions
 * on a footer strip.
 */
export function StateCard({
  tone,
  icon,
  title,
  meta,
  time,
  actions,
  children,
}: {
  tone: "trade" | "offer" | "paused";
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  time?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-clip rounded-lg border bg-card text-sm",
        tone === "trade" && "border-cosmo/50",
        tone === "offer" && "border-sky-500/40",
        tone === "paused" && "border-amber-500/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border-b border-border/60 px-4 py-3">
        <span
          className={cn(
            "[&_svg]:size-4.5",
            tone === "trade" && "text-cosmo dark:text-cosmo-text",
            tone === "offer" && "text-sky-700 dark:text-sky-400",
            tone === "paused" && "text-amber-700 dark:text-amber-500",
          )}
        >
          {icon}
        </span>
        <h2 className="min-w-0 font-semibold">{title}</h2>
        {meta}
        {time !== undefined && (
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {time}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">{children}</div>
      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
        {actions}
      </div>
    </section>
  );
}

/**
 * How long a trade or an offer has left, "31h 12m left".
 */
export function TimeLeft({ deadline }: { deadline: Date }) {
  return (
    <ParaglideMessage
      message={m.listing_detail_time_left}
      inputs={{ left: "" }}
      markup={{ time: () => <Countdown deadline={deadline} /> }}
    />
  );
}

/**
 * The claimer's live trade from the listing: how long it has left, its
 * size and what to send to whom, or that a dispute froze it, with the way
 * to the trade.
 */
export function ClaimerCard({
  listing,
  tradeId,
  deadlineAt,
  size,
}: {
  listing: TradeListing;
  tradeId: string;
  deadlineAt: Date | null;
  size: TradeRatio;
}) {
  const poster = posterName(listing);

  return (
    <StateCard
      tone={deadlineAt === null ? "paused" : "trade"}
      icon={deadlineAt === null ? <IconFlag /> : <IconArrowsExchange />}
      title={m.listing_detail_claimer_trading({ poster })}
      time={
        deadlineAt === null ? undefined : <TimeLeft deadline={deadlineAt} />
      }
      actions={
        <TradeLink tradeId={tradeId}>
          {m.listing_detail_go_to_trade()}
        </TradeLink>
      }
    >
      <p className="flex flex-col gap-1">
        <span>
          <ParaglideMessage
            message={m.listing_detail_claimer_size}
            inputs={{
              ratio: m.market_listings_ratio(size),
            }}
            markup={{
              ratio: ({ children }) => (
                <span className="font-semibold">{children}</span>
              ),
            }}
          />{" "}
          {deadlineAt === null
            ? m.listing_detail_claim_disputed()
            : m.listing_detail_claimer_body({
                count: size.get,
                poster,
                appName: env.VITE_APP_NAME,
              })}
        </span>
        <span className="text-muted-foreground">
          {m.listing_detail_claimer_more()}
        </span>
      </p>
    </StateCard>
  );
}

type OffererProps = {
  listing: TradeListing;
  tradeId: string;
  expiresAt: Date;
  picks: ListingFeedItem[];
  given: ListingFeedItem[];
};

/**
 * The viewer's pending offer on the listing: how long the poster has to
 * answer it, both sides' objekts, that nothing is held meanwhile, and a
 * pick another trade has since taken, which stops the poster accepting it.
 * View opens the offer, and Withdraw ends it after asking. Once it's past
 * its expiry it says so and can't be withdrawn, until trade-timers closes
 * it and the viewer can send another.
 */
export function OffererCard(props: OffererProps) {
  return (
    <Ticker fallback={<OffererState {...props} expired={false} />}>
      {(now) => (
        <OffererState
          {...props}
          expired={props.expiresAt.getTime() <= now.getTime()}
        />
      )}
    </Ticker>
  );
}

function OffererState({
  listing,
  tradeId,
  expiresAt,
  picks,
  given,
  expired,
}: OffererProps & { expired: boolean }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const poster = posterName(listing);
  const taken = takenPick(picks, listing);

  return (
    <StateCard
      tone={expired ? "paused" : "offer"}
      icon={expired ? <IconHourglassEmpty /> : <IconClock />}
      title={
        expired
          ? m.listing_detail_offer_expired_title()
          : m.listing_detail_offerer_waiting({ poster })
      }
      time={expired ? undefined : <TimeLeft deadline={expiresAt} />}
      actions={
        <>
          <TradeLink tradeId={tradeId}>
            {m.listing_detail_view_offer()}
          </TradeLink>
          {!expired && (
            <>
              <Button
                variant="outline"
                className="max-md:h-11"
                onClick={() => setWithdrawing(true)}
              >
                {m.trade_page_offer_withdraw()}
              </Button>
              <OfferActionDialog
                tradeId={tradeId}
                items={[]}
                action="withdraw"
                name={poster}
                listingId={listing.id}
                open={withdrawing}
                onOpenChange={setWithdrawing}
              />
            </>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <ObjektStrip items={picks} />
        <span className="font-mono text-muted-foreground tabular-nums">
          {m.market_listings_ratio({ give: picks.length, get: given.length })}
        </span>
        <ObjektStrip items={given} />
      </div>
      {!expired && taken !== null && (
        <Alert role="status" variant="warning">
          <IconAlertTriangle />
          <AlertTitle>
            {m.listing_detail_offer_pick_taken_title({
              objekt: objektName(taken.collection, taken.attributes),
            })}
          </AlertTitle>
          <AlertDescription>
            {m.listing_detail_offer_pick_taken_body({ poster })}
          </AlertDescription>
        </Alert>
      )}
      <p className="text-muted-foreground">
        {expired
          ? m.listing_detail_offerer_expired({ poster })
          : m.listing_detail_offerer_wait()}
      </p>
    </StateCard>
  );
}

/**
 * Where a claimer goes for their trade or offer from the listing.
 */
function TradeLink({
  tradeId,
  children,
}: {
  tradeId: string;
  children: string;
}) {
  return (
    <Link
      to="/trade/$id"
      params={{ id: tradeId }}
      className={cn(buttonVariants(), "max-md:h-11")}
    >
      {children}
      <IconArrowRight />
    </Link>
  );
}

/**
 * How the viewer's latest offer on the listing ended, over the picker they
 * can send another from.
 */
export function EndedOfferAlert({
  listing,
  status,
}: {
  listing: TradeListing;
  status: EndedOfferStatus;
}) {
  const poster = posterName(listing);
  switch (status) {
    case "declined":
      return (
        <Alert role="status">
          <IconX />
          <AlertTitle>
            {m.listing_detail_offer_declined_title({ poster })}
          </AlertTitle>
          <AlertDescription>{m.listing_detail_offer_again()}</AlertDescription>
        </Alert>
      );
    case "expired":
      return (
        <Alert role="status">
          <IconClock />
          <AlertTitle>{m.listing_detail_offer_expired_title()}</AlertTitle>
          <AlertDescription>
            {m.listing_detail_offer_expired_body({
              poster,
              hours: OFFER_WINDOW / 3_600_000,
            })}
          </AlertDescription>
        </Alert>
      );
    case "stale":
      return (
        <Alert role="status">
          <IconRefresh />
          <AlertTitle>{m.listing_detail_offer_stale_title()}</AlertTitle>
          <AlertDescription>
            {m.listing_detail_offer_stale_body()}
          </AlertDescription>
        </Alert>
      );
  }
}

/**
 * Why the page changed under the viewer's last Accept or offer: another
 * trade took a pool objekt they picked, or the poster changed the listing.
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
    offeredTokenRefusalsQuery(poolItems(listing).map((item) => item.tokenId)),
  );
  const reasons = poolItems(listing).flatMap((item) => {
    const reason = refusals.get(item.tokenId);
    // an objekt in a trade is busy rather than at fault, so it isn't named
    return reason === undefined || reason === "live"
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
 * The strip saying trades hold so much of the pool that nobody can take the
 * listing until one of them ends: to its poster, nothing they need to fix,
 * and to anyone else, when to come back. `reasonId` and `detailId` describe
 * a refused Accept.
 */
export function BusyAlert({
  poster = false,
  reasonId,
  detailId,
}: {
  poster?: boolean;
  reasonId?: string;
  detailId?: string;
}) {
  return (
    <Alert role="status">
      <IconHourglassEmpty />
      <AlertTitle id={reasonId}>
        {poster ? m.listing_poster_busy_title() : m.listing_detail_busy_title()}
      </AlertTitle>
      <AlertDescription id={detailId}>
        {poster ? m.listing_poster_busy_body() : m.listing_detail_busy_body()}
      </AlertDescription>
    </Alert>
  );
}
