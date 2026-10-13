import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { itemLabel, partyName } from "@/lib/client/trades";
import { finishedTradesQuery } from "@/lib/queries/trades";
import {
  type MyTradeRow,
  type MyTradeSide,
  type MyTradesTab,
  myTradesTabs,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Countdown from "../misc/countdown";
import UserAvatar from "../profile/user-avatar";
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
import { EndedBadge } from "./trade-header";
import { Thumbnail } from "./transfer-rows";

type Props = {
  tab: MyTradesTab;
  /** the live trades, which give the counts on either tab */
  active: MyTradeRow[];
};

/**
 * The viewer's trades: the live ones split by who has to act next, or the
 * ended ones a page at a time. Each row opens its trade.
 */
export default function MyTrades({ tab, active }: Props) {
  const groups = [
    {
      title: m.my_trades_group_needs_you(),
      rows: active.filter((row) => row.needsYou),
    },
    {
      title: m.my_trades_group_waiting(),
      rows: active.filter((row) => !row.needsYou),
    },
  ];

  return (
    <>
      <MyTradesHeader
        tab={tab}
        live={active.length}
        needsYou={groups[0]?.rows.length ?? 0}
      />

      <div className="container py-4">
        {tab === "finished" ? (
          <FinishedTrades />
        ) : active.length === 0 ? (
          <MyTradesEmpty tab={tab} />
        ) : (
          <div className="overflow-clip rounded-lg border bg-card text-sm">
            <ColumnHeader tab={tab} />
            {groups.map(
              (group) =>
                group.rows.length > 0 && (
                  <section
                    key={group.title}
                    aria-label={group.title}
                    className="border-t first-of-type:border-t-0"
                  >
                    <h2 className="flex items-baseline gap-2 bg-muted/40 px-4 py-2">
                      <span className="text-sm font-semibold">
                        {group.title}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {group.rows.length}
                      </span>
                    </h2>
                    <ul>
                      {group.rows.map((row) => (
                        <TradeRow key={row.id} row={row} />
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </>
  );
}

function FinishedTrades() {
  const query = useSuspenseInfiniteQuery(finishedTradesQuery());
  const rows = query.data.pages.flatMap((page) => page.rows);

  if (rows.length === 0) return <MyTradesEmpty tab="finished" />;
  return (
    <>
      <div className="overflow-clip rounded-lg border bg-card text-sm">
        <ColumnHeader tab="finished" />
        <ul className="*:first:border-t-0">
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
 * The title, how many trades need the viewer, and the tabs, which keep their
 * place in the URL.
 */
function MyTradesHeader({
  tab,
  live,
  needsYou,
}: {
  tab: MyTradesTab;
  live: number;
  needsYou: number;
}) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-3 py-3 md:h-14 md:flex-nowrap md:py-0">
        <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.my_trades_title()}
        </h1>
        {needsYou > 0 && (
          <Badge variant="cosmo" className="tabular-nums">
            {m.my_trades_need_you({ count: needsYou })}
          </Badge>
        )}

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
            <TabsTrigger value="active">
              {m.my_trades_tab_active()}
              {live > 0 && (
                <span className="font-mono text-xs tabular-nums">{live}</span>
              )}
            </TabsTrigger>
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
 * Desktop columns: kind, you send, arrow, you get, status, with, time. Below
 * lg the sides take the first line and everything else the second.
 */
const grid =
  "grid grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)] gap-x-2 lg:grid-cols-[72px_minmax(0,1fr)_20px_minmax(0,1fr)_160px_168px_112px] lg:gap-x-4";

function ColumnHeader({ tab }: { tab: MyTradesTab }) {
  return (
    <div
      aria-hidden
      className={cn(
        grid,
        "sticky top-14 z-20 hidden border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
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

function TradeRow({ row }: { row: MyTradeRow }) {
  return (
    <li className="border-t border-border/60">
      <Link
        to="/trade/$id"
        params={{ id: row.id }}
        className={cn(
          grid,
          "items-center gap-y-2.5 px-3.5 py-3 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-4 lg:py-2.5",
        )}
      >
        <Side
          side={row.send}
          className="col-start-1 row-start-1 lg:col-start-2"
        />
        <IconArrowsExchange
          aria-hidden
          className="col-start-2 row-start-1 size-4 justify-self-center text-muted-foreground lg:col-start-3 lg:size-5"
        />
        <Side
          side={row.get}
          className="col-start-3 row-start-1 lg:col-start-4"
        />

        <div className="col-span-full row-start-2 flex items-center gap-x-3 lg:contents">
          <span className="flex lg:col-start-1 lg:row-start-1">
            {row.listingId !== null && (
              <Badge variant="outline">{m.my_trades_kind_listing()}</Badge>
            )}
          </span>
          {/* below lg a long name gives way rather than wrapping the line */}
          <span className="flex max-w-48 min-w-0 lg:col-start-5 lg:row-start-1 lg:max-w-none">
            <Status row={row} />
          </span>
          <span className="flex max-w-48 min-w-0 items-center gap-1.5 lg:col-start-6 lg:row-start-1 lg:max-w-none">
            {row.counterparty.user === null ? (
              <UserAvatar deleted className="size-5.5" />
            ) : (
              <UserAvatar
                username={
                  row.counterparty.cosmoUsername ??
                  row.counterparty.user.username
                }
                className="size-5.5 text-xxs **:p-0.5"
              />
            )}
            <span
              className="truncate font-medium"
              title={partyName(row.counterparty)}
            >
              {partyName(row.counterparty)}
            </span>
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground lg:col-start-7 lg:row-start-1 lg:ml-0 lg:text-right">
            <Time row={row} />
          </span>
        </div>
      </Link>
    </li>
  );
}

/**
 * One side's first objekt, how many more there are, and how many of them
 * the drain has seen.
 */
function Side({ side, className }: { side: MyTradeSide; className: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <Thumbnail collection={side.first?.collection ?? null} />
      <span className="flex min-w-0 flex-col gap-0.5">
        {side.first !== null && (
          <span
            className="truncate font-medium max-sm:line-clamp-2 max-sm:whitespace-normal"
            title={itemLabel(side.first)}
          >
            {itemLabel(side.first)}
          </span>
        )}
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {side.first !== null && side.first.serial !== null && (
            <span className="font-mono tabular-nums">
              {formatSerial(side.first.serial)}
            </span>
          )}
          {side.count > 1 && (
            <span className="rounded-sm border bg-muted px-1 font-mono">
              +{side.count - 1}
            </span>
          )}
          <span className="tabular-nums">
            {m.my_trades_sent({ sent: side.sent, count: side.count })}
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Who has to act next on a live trade, or how a finished one ended.
 */
function Status({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "accepted":
      return row.needsYou ? (
        <Badge className="border-transparent bg-cosmo/15 text-cosmo dark:text-cosmo-text">
          {m.my_trades_next_send({ count: row.send.count - row.send.sent })}
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
      return row.pause?.by === "staff" ? (
        <Badge className={tones.muted}>{m.my_trades_next_paused()}</Badge>
      ) : (
        <Badge className={tones.bad}>{m.my_trades_next_dispute()}</Badge>
      );
    case "completed":
    case "cancelled":
    case "timed_out":
      return <EndedBadge status={row.state.status} />;
    // phase 10's offers aren't listed yet
    default:
      return null;
  }
}

/**
 * The time left on a live trade, held where a dispute paused it, or the
 * day a finished one ended.
 */
function Time({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "accepted":
      return (
        <Countdown
          deadline={row.deadlineAt}
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
                deadline={row.deadlineAt}
                pausedAt={row.pause?.at ?? row.deadlineAt}
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
