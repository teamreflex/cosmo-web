import { m } from "@/i18n/messages";
import { partyName } from "@/lib/client/trades";
import { myTradesQuery } from "@/lib/queries/trades";
import {
  type MyTradeRow,
  type MyTradesTab,
  myTradesTabs,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconArrowsExchange, IconArrowsRightLeft } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Countdown from "../misc/countdown";
import {
  Half,
  OfferingCaption,
  Thumbs,
} from "../trade-listings/listing-feed-row";
import { tones } from "../trade-listings/state-tones";
import { Badge } from "../ui/badge";
import { buttonVariants } from "../ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Timestamp } from "../ui/timestamp";
import { EndedBadge, PartyAvatar } from "./trade-header";

/**
 * The viewer's live or ended trades, a page at a time. Each row opens its
 * trade.
 */
export default function MyTrades({ tab }: { tab: MyTradesTab }) {
  return (
    <>
      <MyTradesHeader tab={tab} />
      <div className="container py-4">
        <TradeList key={tab} tab={tab} />
      </div>
    </>
  );
}

function TradeList({ tab }: { tab: MyTradesTab }) {
  const query = useSuspenseInfiniteQuery(myTradesQuery(tab));
  const rows = query.data.pages.flatMap((page) => page.rows);

  if (rows.length === 0) return <MyTradesEmpty tab={tab} />;
  return (
    <>
      <div className="flex flex-col text-sm md:overflow-clip md:rounded-lg md:border md:bg-card">
        <ColumnHeader tab={tab} />
        <ul className="flex flex-col gap-2.5 md:block md:*:first:border-t-0">
          {rows.map((row) => (
            <TradeRow key={row.id} row={row} />
          ))}
        </ul>
      </div>
      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

/**
 * The title and the tabs, which keep their place in the URL.
 */
function MyTradesHeader({ tab }: { tab: MyTradesTab }) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-3 py-3 md:h-14 md:flex-nowrap md:py-0">
        <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.my_trades_title()}
        </h1>
        <Tabs
          className="max-md:basis-full md:ml-auto"
          value={tab}
          onValueChange={(value) => {
            const picked = myTradesTabs.find((option) => option === value);
            if (picked !== undefined) {
              void navigate({
                to: "/market/trades",
                search: { tab: picked },
              });
            }
          }}
        >
          <TabsList aria-label={m.my_trades_tabs()} className="max-md:h-10">
            <TabsTrigger value="active">{m.my_trades_tab_active()}</TabsTrigger>
            <TabsTrigger value="finished">
              {m.my_trades_tab_finished()}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * From lg: kind, you send, arrow, you get, status, with, time, the fixed
 * columns narrower until xl so a single objekt's name and number fit. Below
 * lg a row is a trade slip like the Listings feed's.
 */
const columns =
  "lg:grid-cols-[64px_minmax(0,1fr)_20px_minmax(0,1fr)_150px_114px_96px] xl:grid-cols-[72px_minmax(0,1fr)_20px_minmax(0,1fr)_150px_160px_100px]";

function ColumnHeader({ tab }: { tab: MyTradesTab }) {
  return (
    <div
      aria-hidden
      className={cn(
        "sticky top-14 z-20 hidden gap-x-3.5 border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
        columns,
      )}
    >
      <span>{m.my_trades_column_kind()}</span>
      <span>{m.my_trades_column_send()}</span>
      <span />
      <span>{m.my_trades_column_get()}</span>
      <span>{m.my_trades_column_status()}</span>
      <span>{m.my_trades_column_with()}</span>
      <span className="text-right">
        {tab === "active"
          ? m.my_trades_column_time()
          : m.my_trades_column_ended()}
      </span>
    </div>
  );
}

/**
 * Laid out as a Listings feed row, with the tokens each side sends. Below
 * md the second line holds the status, the other party and the time.
 */
function TradeRow({ row }: { row: MyTradeRow }) {
  return (
    <li className="transition-colors md:border-t md:border-border/60 md:hover:bg-secondary/50">
      <Link
        to="/trade/$id"
        params={{ id: row.id }}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_0_minmax(0,1fr)] text-sm outline-none md:grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] md:items-center md:gap-x-3.5 md:gap-y-2.5 md:px-4 md:py-3 md:focus-visible:bg-secondary/50",
          columns,
          "max-md:overflow-hidden max-md:rounded-[10px] max-md:border max-md:bg-card max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary",
        )}
      >
        <Half
          label={m.my_trades_column_send()}
          thumbs={<Thumbs items={row.send.items} />}
          className="col-start-1 max-md:bg-teal-700/5 lg:col-start-2 max-md:dark:bg-teal-500/5"
        >
          <OfferingCaption items={row.send.items} />
        </Half>

        <span
          aria-hidden
          className="relative col-start-2 row-start-1 text-muted-foreground max-md:border-l max-md:border-dashed lg:col-start-3"
        >
          <span className="absolute top-13 left-0 z-5 flex size-6 -translate-1/2 items-center justify-center rounded-full border bg-card sm:top-1/2 md:hidden">
            <IconArrowsRightLeft className="size-3.5" />
          </span>
          <IconArrowsRightLeft className="size-4 max-md:hidden" />
        </span>

        <Half
          label={m.my_trades_column_get()}
          thumbs={<Thumbs items={row.get.items} />}
          className="col-start-3 max-md:bg-amber-700/5 lg:col-start-4 max-md:dark:bg-amber-500/5"
        >
          <OfferingCaption items={row.get.items} />
        </Half>

        <span className="col-span-full row-start-2 flex min-w-0 items-center gap-2 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs lg:contents">
          <span className="flex lg:col-start-1 lg:row-start-1">
            <Badge variant="outline">
              {row.listingId === null
                ? m.my_trades_kind_offer()
                : m.my_trades_kind_listing()}
            </Badge>
          </span>
          {/* a long name gives way rather than wrapping the line */}
          <span className="flex max-w-48 min-w-0 shrink-0 lg:col-start-5 lg:row-start-1 lg:max-w-none">
            <Status row={row} />
          </span>
          <span className="flex min-w-0 items-center gap-1.5 lg:col-start-6 lg:row-start-1">
            <PartyAvatar
              party={row.counterparty}
              className="size-4.5 text-xxs **:p-0.5 md:size-6"
            />
            {/* on phones "{name} sends" names them already, so the avatar stands in */}
            <span
              className={cn(
                "truncate font-medium",
                !row.needsYou &&
                  row.state.status === "accepted" &&
                  "max-md:sr-only",
              )}
              title={partyName(row.counterparty)}
            >
              {partyName(row.counterparty)}
            </span>
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground lg:col-start-7 lg:row-start-1 lg:ml-0 lg:text-right">
            <Time row={row} />
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Who has to act next on a live trade or a pending offer, or how a
 * finished one ended.
 */
function Status({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "pending":
      return row.needsYou ? (
        <Badge className={tones.cosmo}>{m.my_trades_next_respond()}</Badge>
      ) : (
        <Badge className={tones.muted}>{m.my_trades_next_reply()}</Badge>
      );
    case "accepted":
      return row.needsYou ? (
        <Badge className={tones.cosmo}>
          {m.my_trades_next_send({
            count: row.send.items.length - row.send.sent,
          })}
        </Badge>
      ) : (
        // a long name gives way, so the verb stays
        <Badge
          className={cn(tones.muted, "max-w-full")}
          title={m.my_trades_next_them({ name: partyName(row.counterparty) })}
        >
          <ParaglideMessage
            message={m.my_trades_next_them}
            inputs={{ name: partyName(row.counterparty) }}
            markup={{
              user: ({ children }) => (
                <span className="min-w-0 truncate">{children}</span>
              ),
            }}
          />
        </Badge>
      );
    // a ban's pause reads as neutral, as on the trade page
    case "disputed":
      return row.dispute?.event.by === "staff" ? (
        <Badge className={tones.muted}>{m.my_trades_next_paused()}</Badge>
      ) : (
        <Badge className={tones.bad}>{m.my_trades_next_dispute()}</Badge>
      );
    case "completed":
    case "cancelled":
    case "timed_out":
    case "declined":
    case "withdrawn":
    case "countered":
    case "expired":
    case "stale":
      return (
        <EndedBadge
          status={row.closer === null ? row.state.status : "closed"}
        />
      );
  }
}

/**
 * The time left on a live trade or a pending offer, held where a dispute
 * paused it, or the day a finished one ended.
 */
function Time({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "pending":
    case "accepted":
      return (
        <Countdown
          deadline={row.dueAt}
          className="text-sm font-medium text-foreground"
        />
      );
    case "disputed":
      return (
        <ParaglideMessage
          message={m.trade_page_paused}
          inputs={{ left: "" }}
          markup={{
            time: () => (
              <Countdown
                deadline={row.dueAt}
                pausedAt={row.dispute?.at ?? row.dueAt}
              />
            ),
          }}
        />
      );
    default:
      return (
        row.endedAt !== null && (
          <Timestamp
            date={row.endedAt}
            format={{ month: "short", day: "numeric" }}
            className="font-mono"
          />
        )
      );
  }
}

function MyTradesEmpty({ tab }: { tab: MyTradesTab }) {
  return (
    <Empty className="rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconArrowsExchange />
        </EmptyMedia>
        <EmptyTitle className="text-base">
          {tab === "active"
            ? m.my_trades_empty_active()
            : m.my_trades_empty_finished()}
        </EmptyTitle>
        <EmptyDescription>
          {tab === "active"
            ? m.my_trades_empty_active_body()
            : m.my_trades_empty_finished_body()}
        </EmptyDescription>
      </EmptyHeader>
      {tab === "active" && (
        <EmptyContent>
          <Link
            to="/market"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {m.my_trades_browse()}
          </Link>
        </EmptyContent>
      )}
    </Empty>
  );
}
