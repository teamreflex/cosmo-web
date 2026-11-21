import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  formatAmount,
  partyName,
  paymentMethodLabel,
} from "@/lib/client/trade-listings";
import { itemLabel, tradeTimeFormat, txUrl } from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  TradeItemView,
  TradePaymentView,
  TradeView,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import type { PaymentStatus, TradeItemStatus } from "@apollo/trades/transfers";
import { formatSerial } from "@apollo/util";
import { IconCash, IconExternalLink, IconLock } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { tones } from "../trade-listings/state-tones";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import ConfirmPaymentDialog from "./confirm-payment-dialog";
import MarkPaidDialog from "./mark-paid-dialog";

type Props = {
  trade: TradeView;
  /** the viewer's side, which words each direction, or null for staff */
  side: TradeSide | null;
  /** a strip under the rows, such as what the viewer has to send */
  children?: ReactNode;
};

/**
 * Every serial in the trade, grouped by direction with what the viewer
 * receives first, or the poster's first for staff, and the payment under
 * its sender's. Each row shows where its transfer stands and, once the
 * drain has seen it, when and a link to the transaction. An objekt that
 * moved elsewhere or turned untransferable shows when the drain saw that.
 * Before an offer is accepted, each row says whether its sender still holds
 * it. A payment says whether its recipient confirmed it received, and how.
 */
export default function TransferRows({ trade, side, children }: Props) {
  return (
    <section
      aria-label={m.trade_page_transfers()}
      className="@container overflow-clip rounded-lg border border-border bg-card text-sm"
    >
      {(
        (side === "from"
          ? ["to", "from"]
          : ["from", "to"]) satisfies TradeSide[]
      ).map((sender) => {
        const sent = trade.items.filter((item) => item.sender === sender);
        const payment = trade.payment?.sender === sender ? trade.payment : null;
        if (sent.length === 0 && payment === null) return null;
        const from = partyName(trade.parties[sender]);
        const to = partyName(trade.parties[otherSide(sender)]);
        const heading =
          side === null
            ? `${from} → ${to}`
            : sender === side
              ? m.trade_page_direction_from_you({ name: to })
              : m.trade_page_direction_to_you({ name: from });
        return (
          <div key={sender} className="not-first:border-t">
            <h3 className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="min-w-0 flex-1 truncate" title={heading}>
                {heading}
              </span>
              {/* a payment is confirmed received, never seen; its row says which */}
              {sent.length > 0 && (
                <span className="tabular-nums">
                  {m.trade_page_direction_seen({
                    seen: sent.filter((item) => item.status === "sent").length,
                    count: sent.length,
                  })}
                </span>
              )}
            </h3>
            <ul>
              {sent.map((item) => (
                <TransferRow
                  key={item.id}
                  item={item}
                  yours={sender === side}
                  problemAt={
                    trade.events.findLast(
                      ({ event }) =>
                        (event.type === "token_moved" ||
                          event.type === "token_untransferable") &&
                        event.tokenId === item.tokenId,
                    )?.createdAt
                  }
                />
              ))}
              {payment !== null && (
                <PaymentRow
                  trade={trade}
                  payment={payment}
                  role={
                    side === sender
                      ? "payer"
                      : side === otherSide(sender)
                        ? "recipient"
                        : null
                  }
                />
              )}
            </ul>
          </div>
        );
      })}
      {children}
    </section>
  );
}

/**
 * The trade's payment: its amount for every unit, when its recipient marked
 * it received and by which method, or when its sender marked it paid, and
 * while the trade still counts it, Mark paid for the sender until they do
 * and Confirm received for the recipient until they do.
 */
function PaymentRow({
  trade,
  payment,
  role,
}: {
  trade: TradeView;
  payment: TradePaymentView;
  /** the viewer's part in the payment, or null for staff */
  role: "payer" | "recipient" | null;
}) {
  const [open, setOpen] = useState(false);
  const live =
    trade.stage === "trade" &&
    !trade.deadlinePassed &&
    (trade.state.status === "accepted" || trade.state.status === "disputed");
  const when =
    payment.status === "confirmed" ? (
      <Timestamp date={payment.confirmedAt} format={tradeTimeFormat} />
    ) : payment.status === "paid" ? (
      <Timestamp date={payment.markedPaidAt} format={tradeTimeFormat} />
    ) : null;

  const action =
    role === "payer" && live && payment.status === "waiting" ? (
      <MarkPaidDialog
        tradeId={trade.id}
        listingId={trade.listingId}
        payment={payment}
      />
    ) : role === "recipient" &&
      live &&
      (payment.status === "waiting" || payment.status === "paid") ? (
      <>
        <Button size="sm" onClick={() => setOpen(true)}>
          {m.trade_page_payment_mark_received()}
        </Button>
        <ConfirmPaymentDialog
          tradeId={trade.id}
          listingId={trade.listingId}
          payment={payment}
          methods={trade.paymentMethods}
          name={partyName(trade.parties[payment.sender])}
          open={open}
          onOpenChange={setOpen}
        />
      </>
    ) : null;

  return (
    <li className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5">
      <span className="grid aspect-photocard w-7.5 shrink-0 place-items-center rounded-[3px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <IconCash className="size-4" />
      </span>
      {/* a narrow list puts the action under the amount, so a long label never covers it */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono font-semibold tabular-nums">
            {formatAmount(payment.amount, payment.currency)}
          </span>
          {payment.status === "confirmed" && (
            <span className="text-xs text-muted-foreground">
              {m.trade_page_payment_via({
                method: paymentMethodLabel(payment.method),
              })}
            </span>
          )}
          {when !== null && (
            <span className="text-xs text-muted-foreground @lg:hidden">
              {when}
            </span>
          )}
        </div>
        {action !== null && (
          <div className="ms-auto shrink-0 @max-lg:ms-0 @max-lg:basis-full">
            {action}
          </div>
        )}
      </div>
      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums @max-lg:hidden">
        {when}
      </span>
      <PaymentBadge status={payment.status} />
      {/* the objekt rows' transfer link column, so the badges line up */}
      <span className="size-8 shrink-0 @max-lg:hidden" />
    </li>
  );
}

const paymentBadges = {
  confirmed: {
    label: m.trade_page_payment_received,
    className:
      "border-transparent bg-teal-500/10 text-teal-700 dark:text-teal-500",
  },
  // the sender's word, which settles nothing until the recipient confirms
  paid: {
    label: m.trade_page_payment_paid,
    className: tones.warn,
  },
  waiting: {
    label: m.trade_page_payment_not_paid,
    className: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  },
  not_started: {
    label: m.trade_page_item_not_started,
    className: tones.muted,
  },
  not_confirmed: {
    label: m.trade_page_payment_not_paid,
    className: tones.muted,
  },
} satisfies Record<PaymentStatus, { label: () => string; className: string }>;

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = paymentBadges[status];
  return (
    <Badge variant="outline" className={cn("shrink-0", className)}>
      {label()}
    </Badge>
  );
}

/**
 * One objekt's transfer. A narrow list, on phones or beside the admin
 * queue, puts its serial and time on a second line.
 */
function TransferRow({
  item,
  yours,
  problemAt,
}: {
  item: TradeItemView;
  /** whether the viewer sends it */
  yours: boolean;
  /** when the drain last saw the objekt move elsewhere or turn untransferable */
  problemAt: Date | undefined;
}) {
  const { status } = item;
  const at =
    item.transferredAt ??
    (status === "moved" || status === "untransferable" ? problemAt : undefined);
  const when =
    at !== undefined ? (
      <Timestamp date={at} format={tradeTimeFormat} />
    ) : status === "not_started" ? (
      <span className="text-teal-700 dark:text-teal-500">
        {yours ? m.trade_page_item_held_you() : m.trade_page_item_held_them()}
      </span>
    ) : status !== "not_sent" ? (
      m.trade_page_not_seen()
    ) : null;

  return (
    <li className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5">
      <Thumbnail collection={item.collection} />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 @lg:flex-nowrap">
        <span
          className="min-w-0 truncate font-medium @max-lg:basis-full"
          title={itemLabel(item)}
        >
          {itemLabel(item)}
        </span>
        {item.serial !== null && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {formatSerial(item.serial)}
          </span>
        )}
        {item.locked && (
          <span
            role="img"
            aria-label={m.trade_page_item_locked({
              appName: env.VITE_APP_NAME,
            })}
            title={m.trade_page_item_locked({ appName: env.VITE_APP_NAME })}
            className="shrink-0 self-center text-muted-foreground"
          >
            <IconLock className="size-3.5" />
          </span>
        )}
        {when !== null && (
          <span className="text-xs text-muted-foreground @lg:hidden">
            {when}
          </span>
        )}
      </div>
      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums @max-lg:hidden">
        {when}
      </span>
      <StatusBadge status={status} />
      {item.txHash === null ? (
        <span className="size-8 shrink-0 @max-lg:hidden" />
      ) : (
        <a
          href={txUrl(item.txHash)}
          target="_blank"
          rel="noopener"
          aria-label={m.trade_page_view_transfer()}
          title={m.trade_page_view_transfer()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 text-muted-foreground",
          )}
        >
          <IconExternalLink className="size-4" />
        </a>
      )}
    </li>
  );
}

/**
 * The objekt's front at thumbnail size, or a muted card of the same size
 * when the indexer has lost it or the image fails to load.
 */
function Thumbnail({ collection }: { collection: Objekt.Collection | null }) {
  const [failed, setFailed] = useState(false);

  return collection === null || failed ? (
    <span className="aspect-photocard w-7.5 shrink-0 rounded-[3px] bg-muted" />
  ) : (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt=""
      decoding="async"
      // an image that failed before hydration never fires onError
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
      className="aspect-photocard w-7.5 shrink-0 rounded-[3px] object-cover"
    />
  );
}

const statusBadges = {
  sent: {
    label: m.trade_page_item_sent,
    className:
      "border-transparent bg-teal-500/10 text-teal-700 dark:text-teal-500",
  },
  arrived: {
    label: m.trade_page_item_arrived,
    className: "border-teal-500/40 text-teal-700 dark:text-teal-500",
  },
  waiting: {
    label: m.trade_page_item_waiting,
    className: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  },
  moved: {
    label: m.trade_page_item_moved,
    className:
      "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400",
  },
  untransferable: {
    label: m.trade_page_item_untransferable,
    className: tones.bad,
  },
  not_started: {
    label: m.trade_page_item_not_started,
    className: tones.muted,
  },
  not_sent: {
    label: m.trade_page_item_not_sent,
    className: tones.muted,
  },
} satisfies Record<TradeItemStatus, { label: () => string; className: string }>;

function StatusBadge({ status }: { status: TradeItemStatus }) {
  const { label, className } = statusBadges[status];
  return (
    <Badge variant="outline" className={cn("shrink-0", className)}>
      {label()}
    </Badge>
  );
}
