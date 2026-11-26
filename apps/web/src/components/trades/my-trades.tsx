import { m } from "@/i18n/messages";
import { formatAmount, partyName } from "@/lib/client/trade-listings";
import { myTradesQuery } from "@/lib/queries/trades";
import { itemLines, tradeSideCards } from "@/lib/universal/listing-slip";
import type {
  MyTradeRow,
  MyTradeSide,
  MyTradesPageTab,
  MyTradesTab,
  TradeDispute,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { NextStep, TradePart } from "@apollo/trades/lifecycle";
import type { PaymentStage } from "@apollo/trades/payment";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconArrowsExchange,
  IconArrowsRightLeft,
  IconArrowsUpDown,
} from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Countdown from "../misc/countdown";
import {
  Slip,
  SlipDetail,
  SlipDivider,
  SlipHalf,
  SlipItem,
  SlipItems,
  SlipList,
  TradeSlipFooter,
} from "../trade-listings/slip";
import { SlipFan } from "../trade-listings/slip-fan";
import { SlipLines } from "../trade-listings/slip-lines";
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
import { Timestamp } from "../ui/timestamp";
import MyListings from "./my-listings";
import MyTradesColumnHeader from "./my-trades-column-header";
import MyTradesHeader from "./my-trades-header";
import MyTradesSkeleton from "./my-trades-skeleton";
import { EndedBadge, PartyAvatar } from "./trade-header";

/**
 * My trades: the title and tabs over the open tab, which suspends on its own
 * so the header never waits on a tab's rows. Each tab's boundary is keyed
 * by the tab, so switching to one not cached yet shows its skeleton rather
 * than holding the previous tab.
 */
export default function MyTrades({ tab }: { tab: MyTradesPageTab }) {
  return (
    <>
      <MyTradesHeader tab={tab} />
      <div className="container py-4">
        <Suspense key={tab} fallback={<MyTradesSkeleton tab={tab} />}>
          {tab === "listings" ? <MyListings /> : <TradeList tab={tab} />}
        </Suspense>
      </div>
    </>
  );
}

/**
 * The viewer's live or ended trades, a page at a time. Each row opens its
 * trade.
 */
function TradeList({ tab }: { tab: MyTradesTab }) {
  const query = useSuspenseInfiniteQuery(myTradesQuery(tab));
  const rows = query.data.pages.flatMap((page) => page.rows);

  if (rows.length === 0) return <MyTradesEmpty tab={tab} />;
  return (
    <>
      <SlipList>
        <MyTradesColumnHeader tab={tab} />
        <SlipItems>
          {rows.map((row) => (
            <TradeRow key={row.id} row={row} />
          ))}
        </SlipItems>
      </SlipList>
      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isFetchNextPageError={query.isFetchNextPageError}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

/**
 * Laid out as a Listings feed row, with the tokens each side sends. Below
 * md the footer holds the other party and the time, with the type and the
 * status under them.
 */
function TradeRow({ row }: { row: MyTradeRow }) {
  return (
    <SlipItem className="transition-colors md:hover:bg-secondary/50">
      <Slip
        variant="trade"
        render={<Link to="/trade/$id" params={{ id: row.id }} />}
        className="outline-none max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary md:focus-visible:bg-secondary/50"
      >
        <SlipHalf
          side="give"
          label={m.my_trades_column_send()}
          thumbs={<SlipFan cards={tradeSideCards(row.send)} />}
        >
          <SlipLines lines={itemLines(row.send.items, "compact")} size="sm" />
          <PaymentCaption side={row.send} />
        </SlipHalf>

        <SlipDivider aria-hidden>
          <span className="absolute top-0 left-1/2 z-5 flex size-6 -translate-1/2 items-center justify-center rounded-full border bg-card md:hidden">
            <IconArrowsUpDown className="size-3.5" />
          </span>
          <IconArrowsRightLeft className="size-4 max-md:hidden" />
        </SlipDivider>

        <SlipHalf
          side="get"
          label={m.my_trades_column_get()}
          thumbs={<SlipFan cards={tradeSideCards(row.get)} />}
        >
          <SlipLines lines={itemLines(row.get.items, "compact")} size="sm" />
          <PaymentCaption side={row.get} />
        </SlipHalf>

        <TradeSlipFooter
          type={
            <Badge variant="outline">
              {row.listingId === null
                ? m.my_trades_type_offer()
                : m.my_trades_type_listing()}
            </Badge>
          }
          status={<Status row={row} />}
          party={
            <>
              <PartyAvatar
                party={row.counterparty}
                className="size-4.5 text-xxs md:size-6"
              />
              <span
                className="truncate font-medium"
                title={partyName(row.counterparty)}
              >
                {partyName(row.counterparty)}
              </span>
            </>
          }
          time={<Time row={row} />}
        />
      </Slip>
    </SlipItem>
  );
}

// how a side's payment reads, alone or beside its objekts
const paymentCaptions = {
  pay: {
    confirmed: m.my_trades_payment_only_received,
    marked: m.my_trades_payment_only_paid,
    unpaid: m.my_trades_payment_only,
  },
  send_pay: {
    confirmed: m.my_trades_payment_received,
    marked: m.my_trades_payment_paid,
    unpaid: m.my_trades_payment,
  },
} satisfies Record<
  Exclude<TradePart, "send">,
  Record<PaymentStage, (inputs: { amount: string }) => string>
>;

// the payment a side sends, in its own currency, and whether it was confirmed received or marked paid
export function PaymentCaption({ side }: { side: MyTradeSide }) {
  if (side.part === "send") return null;
  const { payment } = side;
  return (
    <SlipDetail className="font-medium text-foreground">
      {paymentCaptions[side.part][payment.progress.stage]({
        amount: formatAmount(payment.amount, payment.currency),
      })}
    </SlipDetail>
  );
}

/**
 * Who has to act next on a live trade or a pending offer, or how a
 * finished one ended.
 */
function Status({ row }: { row: MyTradeRow }) {
  switch (row.state.status) {
    case "pending":
      return row.nextStep !== null ? (
        <Badge className={tones.cosmo}>{m.my_trades_next_respond()}</Badge>
      ) : (
        <Badge className={tones.muted}>{m.my_trades_next_reply()}</Badge>
      );
    case "accepted":
      return (
        <NextStepBadge step={row.nextStep} name={partyName(row.counterparty)} />
      );
    case "disputed":
      return <DisputeBadge dispute={row.dispute} />;
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
      return <PausedTime deadline={row.dueAt} dispute={row.dispute} />;
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

// what the viewer's next step reads as
function stepLabel(step: NextStep) {
  switch (step.kind) {
    case "answer":
      return m.my_trades_next_respond();
    case "send":
      return m.my_trades_next_send({ count: step.count });
    case "mark_paid":
      return m.my_trades_next_mark_paid();
    case "confirm":
      return m.my_trades_next_confirm();
  }
}

/**
 * What a live trade waits on: the viewer's next step (NextStep), or the
 * other party, named.
 */
export function NextStepBadge({
  step,
  name,
}: {
  step: NextStep | null;
  name: string;
}) {
  return step !== null ? (
    <Badge className={tones.cosmo}>{stepLabel(step)}</Badge>
  ) : (
    // a long name gives way, so the verb stays
    <Badge
      className={cn(tones.muted, "max-w-full")}
      title={m.my_trades_next_them({ name })}
    >
      <ParaglideMessage
        message={m.my_trades_next_them}
        inputs={{ name }}
        markup={{
          user: ({ children }) => (
            <span className="min-w-0 truncate">{children}</span>
          ),
        }}
      />
    </Badge>
  );
}

// a pause by a ban or a passed deadline reads as neutral, as on the trade page
export function DisputeBadge({ dispute }: { dispute: TradeDispute | null }) {
  return dispute?.event.by === "staff" || dispute?.event.by === "deadline" ? (
    <Badge className={tones.muted}>{m.my_trades_next_paused()}</Badge>
  ) : (
    <Badge className={tones.bad}>{m.my_trades_next_dispute()}</Badge>
  );
}

// the time a disputed trade's deadline had left when the dispute froze it
export function PausedTime({
  deadline,
  dispute,
}: {
  deadline: Date;
  dispute: TradeDispute | null;
}) {
  return (
    <ParaglideMessage
      message={m.trade_page_paused}
      inputs={{ left: "" }}
      markup={{
        time: () => (
          <Countdown deadline={deadline} pausedAt={dispute?.at ?? deadline} />
        ),
      }}
    />
  );
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
