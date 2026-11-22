import { idLink, logTimeFormat, shortId } from "@/components/admin/common";
import LogPanel from "@/components/admin/log-panel";
import Countdown from "@/components/misc/countdown";
import { OfferingCaption } from "@/components/trade-listings/listing-feed-row";
import { tones } from "@/components/trade-listings/state-tones";
import {
  DisputeBadge,
  PausedTime,
  PaymentCaption,
} from "@/components/trades/my-trades";
import { EndedBadge, PartyAvatar } from "@/components/trades/trade-header";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { partyName } from "@/lib/client/trade-listings";
import { marketActivityQuery } from "@/lib/queries/market-activity";
import {
  isNewSince,
  type MarketActivityFilters,
  type MarketActivityRow,
  type MarketSnapshot,
} from "@/lib/universal/market-activity";
import type { MyTradeSide, TradePartyName } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconArrowRight,
  IconArrowsExchange,
  IconArrowsRightLeft,
} from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  filters: MarketActivityFilters;
  // what the feed showed at the last Refresh, null before the first
  seen: MarketSnapshot | null;
};

/**
 * Every trade and offer by its latest change, newest first. Rows that
 * changed since the last Refresh are marked.
 */
export default function MarketFeed({ filters, seen }: Props) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(marketActivityQuery(filters));
  const rows = data.pages.flatMap((page) => page.rows);

  return (
    <LogPanel
      emptyIcon={<IconArrowsExchange />}
      emptyTitle={
        filters.view === "all" && filters.status === undefined
          ? m.admin_market_empty()
          : m.admin_market_empty_filtered()
      }
      loaded={rows.length}
      total={data.pages[0]?.total ?? rows.length}
      showing={m.admin_market_showing}
      olderLabel={m.admin_market_older()}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    >
      <MarketTable>
        {rows.map((row) => (
          <MarketRow
            key={row.id}
            row={row}
            isNew={seen !== null && isNewSince(seen, row)}
          />
        ))}
      </MarketTable>
    </LogPanel>
  );
}

/**
 * A row's place in the table's columns, which it shares through subgrid.
 * Narrow panels stack activity and time over the parties, the exchange and
 * the origin.
 */
const marketRow =
  "col-span-full grid-cols-subgrid [grid-template-areas:'act_when'_'parties_parties'_'exchange_exchange'_'origin_origin'] @4xl:[grid-template-areas:'act_parties_exchange_origin_when']";

function MarketTable({ children }: { children: ReactNode }) {
  return (
    <div
      role="table"
      aria-label={m.admin_market_title()}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 @4xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_auto]"
    >
      <div
        role="row"
        className={cn(
          "hidden h-10 items-center border-b px-4 font-medium text-muted-foreground @4xl:grid",
          marketRow,
        )}
      >
        <span role="columnheader" className="[grid-area:act]">
          {m.admin_market_column_activity()}
        </span>
        <span role="columnheader" className="[grid-area:parties]">
          {m.admin_market_column_parties()}
        </span>
        <span role="columnheader" className="[grid-area:exchange]">
          {m.admin_market_column_exchange()}
        </span>
        <span role="columnheader" className="[grid-area:origin]">
          {m.admin_market_column_origin()}
        </span>
        <span role="columnheader" className="[grid-area:when]">
          {m.admin_market_column_when()}
        </span>
      </div>
      {children}
    </div>
  );
}

function MarketRow({ row, isNew }: { row: MarketActivityRow; isNew: boolean }) {
  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-y-2 border-b border-border/60 px-4 py-3 @4xl:gap-y-0",
        marketRow,
        isNew && "bg-cosmo/5 shadow-[inset_2px_0_0_var(--color-cosmo)]",
      )}
    >
      <div
        role="cell"
        className="flex min-w-0 flex-col items-start gap-1 [grid-area:act]"
      >
        <StatusBadge row={row} />
        <span className="flex items-center gap-2">
          <Link to="/trade/$id" params={{ id: row.id }} className={idLink}>
            {shortId(row.id)}
          </Link>
          {isNew && (
            <span className="text-xxs font-medium tracking-widest text-cosmo uppercase dark:text-cosmo-text">
              {m.admin_market_new()}
            </span>
          )}
        </span>
        <StatusDetail row={row} />
      </div>

      <div
        role="cell"
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [grid-area:parties]"
      >
        <Parties row={row} />
      </div>

      <div
        role="cell"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 [grid-area:exchange]"
      >
        <Side side={row.fromSide} />
        <IconArrowsRightLeft
          aria-hidden
          className="size-4 text-muted-foreground"
        />
        <Side side={row.toSide} />
      </div>

      <div
        role="cell"
        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 [grid-area:origin] @4xl:flex-col @4xl:items-start"
      >
        <Origin row={row} />
      </div>

      <div
        role="cell"
        className="self-start font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:when] @4xl:self-center @4xl:text-right"
      >
        <Timestamp date={row.updatedAt} format={logTimeFormat} />
      </div>
    </div>
  );
}

/**
 * The badges the trade page and My trades use: a pending offer waits on an
 * answer, a claim goes live without one, and a dispute reads as paused when
 * staff or the deadline froze it.
 */
function StatusBadge({ row }: { row: MarketActivityRow }) {
  const { state } = row;
  switch (state.status) {
    case "pending":
      return (
        <Badge className={tones.waiting}>{m.my_trades_kind_offer()}</Badge>
      );
    case "accepted":
      return (
        <Badge className={tones.cosmo}>
          {row.origin.kind === "claim"
            ? m.admin_market_badge_claimed()
            : m.admin_market_badge_accepted()}
        </Badge>
      );
    case "disputed":
      return <DisputeBadge dispute={state.dispute} />;
    default:
      return <EndedBadge status={state.status} />;
  }
}

/**
 * The time a pending offer or live trade has left, with how many objekts
 * have arrived on a live one.
 */
function StatusDetail({ row }: { row: MarketActivityRow }) {
  const { state } = row;
  switch (state.status) {
    case "pending":
      return (
        <Detail>
          <ParaglideMessage
            message={m.trade_page_offer_time_left}
            inputs={{ left: "" }}
            markup={{ time: () => <Countdown deadline={state.dueAt} /> }}
          />
        </Detail>
      );
    case "accepted":
      return (
        <Detail>
          <ParaglideMessage
            message={m.trade_page_time_left}
            inputs={{ left: "" }}
            markup={{ time: () => <Countdown deadline={state.dueAt} /> }}
          />
          <Progress row={row} />
        </Detail>
      );
    case "disputed":
      return (
        <Detail>
          <PausedTime deadline={state.dueAt} dispute={state.dispute} />
          <Progress row={row} />
        </Detail>
      );
    default:
      return null;
  }
}

function Detail({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

// how many of the trade's objekts have arrived
function Progress({ row }: { row: MarketActivityRow }) {
  const total = row.fromSide.items.length + row.toSide.items.length;
  if (total === 0) return null;
  return (
    <span>
      {"· "}
      {m.admin_market_sent({
        sent: row.fromSide.sent + row.toSide.sent,
        total,
      })}
    </span>
  );
}

/**
 * Both parties: a pending offer reads from the side that proposed it to the
 * side that answers it, anything else as a swap between poster and claimer.
 * The arrow wraps with the second party, so a narrow column reads as two
 * lines.
 */
function Parties({ row }: { row: MarketActivityRow }) {
  const { state } = row;
  const [first, second, Arrow] =
    state.status !== "pending"
      ? [row.from, row.to, IconArrowsRightLeft]
      : state.proposedBy === "from"
        ? [row.from, row.to, IconArrowRight]
        : [row.to, row.from, IconArrowRight];
  return (
    <>
      <Party party={first} />
      <span className="flex min-w-0 items-center gap-2">
        <Arrow
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <Party party={second} />
      </span>
    </>
  );
}

function Party({ party }: { party: TradePartyName }) {
  const name = partyName(party);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <PartyAvatar party={party} className="size-5 text-xxs **:p-0.5" />
      <span className="truncate font-medium" title={name}>
        {name}
      </span>
    </span>
  );
}

// what one side sends: its objekts by name, then its payment
function Side({ side }: { side: MyTradeSide }) {
  return (
    <span className="flex max-w-full min-w-0 flex-col gap-0.5">
      {side.items.length === 0 && side.payment === null ? (
        <span className="text-xs text-muted-foreground">
          {m.admin_market_nothing()}
        </span>
      ) : (
        <>
          <OfferingCaption items={side.items} />
          <PaymentCaption side={side} />
        </>
      )}
    </span>
  );
}

function Origin({ row }: { row: MarketActivityRow }) {
  const { origin } = row;
  switch (origin.kind) {
    case "claim":
    case "listing_offer":
      return (
        <>
          <span>
            {origin.kind === "claim"
              ? m.admin_market_origin_claim()
              : m.admin_market_origin_listing_offer()}
          </span>
          <Link
            to="/market/listing/$id"
            params={{ id: origin.listingId }}
            className={idLink}
          >
            {m.admin_market_listing_link({ id: shortId(origin.listingId) })}
          </Link>
        </>
      );
    case "direct_offer":
      return <span>{m.trade_page_direct_offer()}</span>;
    case "counter":
      return (
        <>
          <span>{m.admin_market_origin_counter()}</span>
          <Link
            to="/trade/$id"
            params={{ id: origin.parentId }}
            className={idLink}
          >
            {m.admin_market_counter_link({ id: shortId(origin.parentId) })}
          </Link>
        </>
      );
  }
}
