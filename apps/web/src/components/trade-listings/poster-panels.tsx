import { m } from "@/i18n/messages";
import { formatOfferRefusal } from "@/lib/client/errors/trades";
import { partyName } from "@/lib/client/trade-listings";
import {
  isLiveTrade,
  type ListingFeedItem,
  type ListingOfferSummary,
  type ListingTrade,
  liveHolder,
  type PosterTab,
  posterTabs,
} from "@/lib/universal/trade-listings";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconChevronRight,
  IconInbox,
} from "@tabler/icons-react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import FeedbackBadge from "../feedback/feedback-badge";
import Countdown from "../misc/countdown";
import { DisputeBadge, NextStepBadge, PausedTime } from "../trades/my-trades";
import OfferActionDialog, {
  type OfferAction,
} from "../trades/offer-action-dialog";
import { EndedBadge, PartyAvatar, PartyLink } from "../trades/trade-header";
import { Alert, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Timestamp } from "../ui/timestamp";
import { StateCard, TimeLeft } from "./listing-status";
import ObjektStrip from "./objekt-strip";
import { Eyebrow } from "./side-heading";

const route = getRouteApi("/market/listing/$id");

const tabLabels = {
  listing: m.listing_poster_tab_listing,
  offers: m.listing_poster_tab_offers,
  trades: m.listing_poster_tab_trades,
} satisfies Record<PosterTab, () => string>;

/**
 * The poster's tabs on their own listing, each with its count, which keep
 * their place in the URL. Pending offers wait on the poster, so their count
 * stands out. Scrolls sideways on narrow phones.
 */
export function PosterTabBar({
  tabs,
  value,
}: {
  tabs: { tab: PosterTab; count: number }[];
  value: PosterTab;
}) {
  const navigate = route.useNavigate();

  return (
    <Tabs
      variant="navbar"
      value={value}
      onValueChange={(next) => {
        const picked = posterTabs.find((tab) => tab === next);
        if (picked !== undefined) {
          void navigate({
            search: (prev) => ({ ...prev, tab: picked }),
            replace: true,
            resetScroll: false,
          });
        }
      }}
    >
      <TabsList
        aria-label={m.listing_poster_tabs()}
        className="h-11 w-max border-none"
      >
        {tabs.map(({ tab, count }) => (
          <TabsTrigger key={tab} value={tab} className="flex-none px-3">
            {tabLabels[tab]()}
            {count > 0 && (
              <Badge
                variant={tab === "offers" ? "cosmo" : "secondary"}
                className="h-4.5 min-w-4.5 px-1 font-mono tabular-nums"
              >
                {count}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * The pending offers on the poster's listing, newest first. The listing's
 * trades name who holds a pick that stops one.
 */
export function PosterOffers({
  listingId,
  offers,
  trades,
}: {
  listingId: string;
  offers: ListingOfferSummary[];
  trades: ListingTrade[];
}) {
  if (offers.length === 0) {
    return (
      <PanelEmpty
        icon={<IconInbox />}
        title={m.listing_poster_offers_empty()}
        body={m.listing_poster_offers_empty_body()}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {offers.map((offer) => (
        <li key={offer.tradeId}>
          <OfferCard listingId={listingId} offer={offer} trades={trades} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A pending offer: who sent it with their rating, its ratio and how long
 * it has left, then what they send for which of the poster's objekts.
 * One that can't be accepted now says why, dims the objekt it names and
 * can only be declined. Accept and Decline each ask first.
 */
function OfferCard({
  listingId,
  offer,
  trades,
}: {
  listingId: string;
  offer: ListingOfferSummary;
  trades: ListingTrade[];
}) {
  const reasonId = useId();
  const [dialog, setDialog] = useState<OfferAction | null>(null);
  const { claimer, refusal } = offer;
  const refusedToken =
    refusal !== null && "tokenId" in refusal ? refusal.tokenId : null;
  // the live trade from the listing that holds the pick a refusal names
  const holding =
    refusedToken === null ? undefined : liveHolder(refusedToken, trades);
  const holder = holding === undefined ? null : partyName(holding.claimer);
  const items = [...offer.picks, ...offer.given].map((item) => ({
    tokenId: item.tokenId,
    slug: item.attributes.slug,
    serial: item.serial,
    collection: item.collection,
  }));

  return (
    <StateCard
      tone={refusal === null ? "offer" : "paused"}
      icon={<PartyAvatar party={claimer} className="size-6 text-xs **:p-1" />}
      title={<PartyLink party={claimer} />}
      meta={
        <>
          {claimer.user !== null && (
            <FeedbackBadge variant="full" rep={claimer.rep} narrow />
          )}
          <Badge variant="secondary" className="font-mono tabular-nums">
            {m.market_listings_ratio({
              give: offer.picks.length,
              get: offer.given.length,
            })}
          </Badge>
        </>
      }
      time={
        <ParaglideMessage
          message={m.trade_page_offer_time_left}
          inputs={{ left: "" }}
          markup={{ time: () => <Countdown deadline={offer.expiresAt} /> }}
        />
      }
      actions={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => setDialog("decline")}
          >
            {m.trade_page_offer_decline()}
          </Button>
          <Button
            variant="cosmo"
            className="max-md:h-11 data-disabled:pointer-events-none data-disabled:opacity-50"
            disabled={refusal !== null}
            focusableWhenDisabled
            aria-describedby={refusal === null ? undefined : reasonId}
            onClick={() => setDialog("accept")}
          >
            {m.trade_page_offer_accept()}
          </Button>
          {(["accept", "decline"] satisfies OfferAction[]).map((action) => (
            <OfferActionDialog
              key={action}
              tradeId={offer.tradeId}
              items={items}
              action={action}
              name={partyName(claimer)}
              listingId={listingId}
              linkTrade
              open={dialog === action}
              onOpenChange={(open) => setDialog(open ? action : null)}
            />
          ))}
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <OfferSide
          tone="want"
          title={m.listing_poster_offer_they_send()}
          items={offer.given}
          dimmed={refusedToken}
        />
        <OfferSide
          tone="have"
          title={m.listing_poster_offer_you_send()}
          items={offer.picks}
          dimmed={refusedToken}
        />
      </div>
      {refusal !== null && (
        <Alert role="status" variant="warning">
          <IconAlertTriangle />
          <AlertTitle id={reasonId}>
            {formatOfferRefusal(refusal, offer, holder)}
          </AlertTitle>
        </Alert>
      )}
    </StateCard>
  );
}

/**
 * One side of an offer under its label: "They send" in the want colour,
 * "You send" in the have colour, each objekt with its serial.
 */
function OfferSide({
  tone,
  title,
  items,
  dimmed,
}: {
  tone: "have" | "want";
  title: string;
  items: ListingFeedItem[];
  /** the objekt the offer's refusal names */
  dimmed: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Eyebrow tone={tone}>{title}</Eyebrow>
      <ObjektStrip items={items} captions dimmed={dimmed} />
    </div>
  );
}

/**
 * Every trade the poster's listing started, the live ones first, each
 * opening its trade.
 */
export function PosterTrades({ trades }: { trades: ListingTrade[] }) {
  const live = trades.filter(isLiveTrade);
  const finished = trades.filter((trade) => !isLiveTrade(trade));

  if (trades.length === 0) {
    return (
      <PanelEmpty
        icon={<IconArrowsExchange />}
        title={m.listing_poster_trades_empty()}
        body={m.listing_poster_trades_empty_body()}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {live.length > 0 && (
        <TradeSection title={m.my_trades_tab_active()} trades={live} />
      )}
      {finished.length > 0 && (
        <TradeSection title={m.my_trades_tab_finished()} trades={finished} />
      )}
    </div>
  );
}

function TradeSection({
  title,
  trades,
}: {
  title: string;
  trades: ListingTrade[];
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      <ul className="flex flex-col overflow-clip rounded-lg border bg-card text-sm">
        {trades.map((trade) => (
          <li
            key={trade.tradeId}
            className="border-border/60 transition-colors not-first:border-t hover:bg-secondary/50"
          >
            <TradeRow trade={trade} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A trade from the listing: its claimer, its ratio, where it stands, and
 * how long it has left or the day it ended.
 */
function TradeRow({ trade }: { trade: ListingTrade }) {
  return (
    <Link
      to="/trade/$id"
      params={{ id: trade.tradeId }}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 outline-none focus-visible:bg-secondary/50"
    >
      <PartyAvatar party={trade.claimer} className="size-7 text-xs **:p-1" />
      <span
        className="min-w-28 flex-1 truncate font-medium sm:max-w-48"
        title={partyName(trade.claimer)}
      >
        {partyName(trade.claimer)}
      </span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {m.market_listings_ratio({
          give: trade.tokenIds.length,
          get: trade.givenCount,
        })}
      </span>
      <TradeState trade={trade} name={partyName(trade.claimer)} />
      <IconChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}

/**
 * Where a trade stands for the poster, as My trades says it: a live one's
 * next step (what they still have to send, or that the claimer sends) and
 * the time it has left, a disputed one paused or under dispute with the
 * time it holds, or a finished one's ending and its day.
 */
function TradeState({
  trade,
  name,
}: {
  trade: ListingTrade;
  /** the claimer, as the row names them */
  name: string;
}) {
  switch (trade.status) {
    case "accepted":
      return (
        <>
          <NextStepBadge
            needsYou={trade.needsYou}
            toSend={trade.toSend}
            name={name}
          />
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            <TimeLeft deadline={trade.deadlineAt} />
          </span>
        </>
      );
    case "disputed":
      return (
        <>
          <DisputeBadge dispute={trade.dispute} />
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            <PausedTime deadline={trade.deadlineAt} dispute={trade.dispute} />
          </span>
        </>
      );
    case "completed":
    case "cancelled":
    case "timed_out":
      return (
        <>
          <EndedBadge status={trade.status} />
          <Timestamp
            date={trade.endedAt}
            format={{ month: "short", day: "numeric" }}
            className="ms-auto font-mono text-xs text-muted-foreground"
          />
        </>
      );
  }
}

function PanelEmpty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Empty className="rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
