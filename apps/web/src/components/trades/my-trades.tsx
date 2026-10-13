import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { itemLabel, partyName } from "@/lib/client/trades";
import type {
  MyTradeRow,
  MyTradeSide,
  MyTradesTab,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconArrowsExchange } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { EndedBadge } from "./trade-header";
import { Thumbnail } from "./transfer-rows";

type Props = {
  tab: MyTradesTab;
  /** the live trades, which give the counts on either tab */
  active: MyTradeRow[];
  /** the shown tab's trades */
  rows: MyTradeRow[];
};

/**
 * The viewer's trades: the live ones split by who has to act next, or
 * those that ended in the last 30 days. Each row opens its trade.
 */
export default function MyTrades({ tab, active, rows }: Props) {
  const needsYou = active.filter((row) => row.needsYou).length;
  const groups =
    tab === "active"
      ? [
          {
            title: m.my_trades_group_needs_you(),
            rows: rows.filter((row) => row.needsYou),
          },
          {
            title: m.my_trades_group_waiting(),
            rows: rows.filter((row) => !row.needsYou),
          },
        ]
      : [{ title: m.my_trades_group_finished(), rows }];

  return (
    <>
      <MyTradesHeader tab={tab} live={active.length} needsYou={needsYou} />

      <div className="container flex flex-col gap-3 py-4">
        <p className="text-sm text-muted-foreground">
          {m.my_trades_description()}
        </p>

        {rows.length === 0 ? (
          <MyTradesEmpty tab={tab} />
        ) : (
          <div className="overflow-clip rounded-lg border bg-card text-sm">
            <ColumnHeader tab={tab} />
            {groups.map(
              (group) =>
                group.rows.length > 0 && (
                  <section key={group.title} aria-label={group.title}>
                    <h2 className="flex items-baseline gap-2 border-t bg-muted/40 px-4 py-2 first:border-t-0 lg:first:border-t">
                      <span className="text-sm font-semibold">
                        {group.title}
                      </span>
                      {tab === "active" && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {group.rows.length}
                        </span>
                      )}
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

/**
 * The title, how many trades need the viewer, and the tabs, which keep their
 * place in the URL.
 */
function MyTradesHeader({
  tab,
  live,
  needsYou,
}: {
  tab: MyTradesTab | null;
  live: number | null;
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

        <div className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 md:mx-0 md:ml-auto md:w-auto md:px-0">
          <ToggleGroup
            aria-label={m.my_trades_tabs()}
            variant="outline"
            size="sm"
            spacing={0}
            value={tab === null ? [] : [tab]}
            // pressing the current tab again keeps it
            onValueChange={([picked]) => {
              if (picked === "active" || picked === "finished") {
                void navigate({
                  to: "/market/trades",
                  search: { tab: picked },
                });
              }
            }}
            className="shrink-0"
          >
            <ToggleGroupItem value="active" className="max-md:h-9">
              {m.my_trades_tab_active()}
              {live !== null && live > 0 && (
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {live}
                </span>
              )}
            </ToggleGroupItem>
            <ToggleGroupItem value="finished" className="max-md:h-9">
              {m.my_trades_tab_finished()}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop columns: kind, you send, arrow, you get, next, with, time. Below
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
      <span>{m.my_trades_column_next()}</span>
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

        <div className="col-span-full row-start-2 flex flex-wrap items-center gap-x-3 gap-y-2 lg:contents">
          <span className="flex lg:col-start-1 lg:row-start-1">
            {row.listingId !== null && (
              <Badge variant="outline">{m.my_trades_kind_listing()}</Badge>
            )}
          </span>
          <span className="flex min-w-0 lg:col-start-5 lg:row-start-1">
            <Next row={row} />
          </span>
          <span className="flex min-w-0 items-center gap-1.5 lg:col-start-6 lg:row-start-1">
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
            <span className="truncate font-medium">
              {partyName(row.counterparty)}
            </span>
          </span>
          <span className="ml-auto text-xs text-muted-foreground lg:col-start-7 lg:row-start-1 lg:ml-0 lg:text-right">
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
        <span className="flex min-w-0 items-baseline gap-1.5">
          {side.first !== null && (
            <span className="truncate font-medium max-sm:line-clamp-2 max-sm:whitespace-normal">
              {itemLabel(side.first)}
            </span>
          )}
          {side.count > 1 && (
            <span className="shrink-0 rounded-sm border bg-muted px-1 font-mono text-xs text-muted-foreground">
              +{side.count - 1}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-wrap gap-x-1.5 text-xs text-muted-foreground">
          {side.first !== null && side.first.serial !== null && (
            <span className="font-mono tabular-nums">
              {formatSerial(side.first.serial)}
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
function Next({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "accepted":
      return row.needsYou ? (
        <Badge className="border-transparent bg-cosmo/15 text-cosmo dark:text-cosmo-text">
          {m.my_trades_next_send({ count: row.send.count - row.send.sent })}
        </Badge>
      ) : (
        <Badge className={cn(tones.muted, "max-w-full")}>
          <span className="truncate">
            {m.my_trades_next_them({ name: partyName(row.counterparty) })}
          </span>
        </Badge>
      );
    case "disputed":
      return <Badge className={tones.bad}>{m.my_trades_next_dispute()}</Badge>;
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
                pausedAt={row.pausedAt ?? row.deadlineAt}
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

export function MyTradesSkeleton() {
  return (
    <>
      <MyTradesHeader tab={null} live={null} needsYou={0} />
      <div className="container flex flex-col gap-3 py-4">
        <Skeleton className="h-5 w-72 max-w-full" />
        <div className="flex flex-col gap-px overflow-clip rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-none" />
          ))}
        </div>
      </div>
    </>
  );
}
