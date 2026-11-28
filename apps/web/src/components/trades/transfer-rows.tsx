import { m } from "@/i18n/messages";
import {
  formatAmount,
  partyName,
  paymentMethodLabel,
} from "@/lib/client/trade-listings";
import {
  itemLabel,
  pinnedLabel,
  substituteSourceName,
  tradeTimeFormat,
  txUrl,
} from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import { substituteCandidatesQuery } from "@/lib/queries/trades";
import type {
  TradeItemView,
  TradePaymentView,
  TradeView,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide, partyAction } from "@apollo/trades/lifecycle";
import type { PaymentStatus, TradeItemStatus } from "@apollo/trades/transfers";
import { formatSerial } from "@apollo/util";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconCash, IconExternalLink, IconLock } from "@tabler/icons-react";
import { noop, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { tones } from "../trade-listings/state-tones";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import AcceptSubstituteDialog from "./accept-substitute-dialog";
import ConfirmPaymentDialog from "./confirm-payment-dialog";
import MarkPaidDialog from "./mark-paid-dialog";
import ObjektThumbnail from "./objekt-thumbnail";

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
              {sent.map((item) => {
                const offer = substituteOffer(trade, item, side);
                return (
                  <TransferRow
                    key={item.id}
                    item={item}
                    yours={sender === side}
                    senderName={from}
                    action={
                      offer === null ? null : (
                        <SubstituteAction
                          trade={trade}
                          item={item}
                          senderName={from}
                          completes={offer.status === "completed"}
                        />
                      )
                    }
                    problemAt={
                      trade.events.findLast(
                        ({ event }) =>
                          (event.type === "token_moved" ||
                            event.type === "token_untransferable") &&
                          event.tokenId === item.tokenId,
                      )?.createdAt
                    }
                  />
                );
              })}
              {payment !== null && (
                <PaymentRow trade={trade} payment={payment} side={side} />
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
 * Mark paid for the sender and Confirm received for the recipient wherever
 * the server would allow them, the same judgement it makes, so a refused
 * action refetches into a row that no longer offers it.
 */
function PaymentRow({
  trade,
  payment,
  side,
}: {
  trade: TradeView;
  payment: TradePaymentView;
  /** the viewer's side, or null for staff */
  side: TradeSide | null;
}) {
  const [open, setOpen] = useState(false);
  const offered = (type: "mark_paid" | "confirm_payment") =>
    side !== null &&
    partyAction(
      trade.state,
      {
        type,
        item: trade.state.items.findIndex((item) => item.kind === "payment"),
        by: side,
      },
      {
        deadlinePassed: trade.stage === "trade" && trade.deadlinePassed,
        arrived: trade.items.some((item) => item.status === "arrived"),
      },
    ).ok;
  const { progress } = payment;
  const when =
    progress.stage === "unpaid" ? null : (
      <Timestamp date={progress.at} format={tradeTimeFormat} />
    );

  const action = offered("mark_paid") ? (
    <MarkPaidDialog
      tradeId={trade.id}
      listingId={trade.listingId}
      payment={payment}
    />
  ) : offered("confirm_payment") ? (
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
          <span className="font-semibold tabular-nums">
            {formatAmount(payment.amount, payment.currency)}
          </span>
          {progress.stage === "confirmed" && (
            <span className="text-xs text-muted-foreground">
              {m.trade_page_payment_via({
                method: paymentMethodLabel(progress.method),
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
      <ItemBadge {...paymentBadges[payment.status]} />
      {/* the objekt rows' transfer link column, so the badges line up */}
      <span className="size-8 shrink-0 @max-lg:hidden" />
    </li>
  );
}

const paymentBadges = {
  confirmed: {
    label: m.trade_page_payment_received,
    className: tones.teal,
  },
  // the sender's word, which settles nothing until the recipient confirms
  paid: {
    label: m.trade_page_payment_paid,
    className: tones.warn,
  },
  waiting: {
    label: m.trade_page_payment_not_paid,
    className: tones.waiting,
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

/**
 * Whether the viewer may accept another copy in place of an objekt they are
 * owed that hasn't arrived, the same judgement the server makes, and the
 * trade it would leave. A token that reached them before the drain recorded
 * it is about to settle the item, so it isn't offered.
 */
function substituteOffer(
  trade: TradeView,
  item: TradeItemView,
  side: TradeSide | null,
) {
  if (side === null || item.status === "arrived") return null;
  const result = partyAction(
    trade.state,
    { type: "accept_substitute", item: item.index, by: side },
    {
      deadlinePassed: trade.stage === "trade" && trade.deadlinePassed,
      arrived: false,
    },
  );
  return result.ok ? result.trade : null;
}

/**
 * Wrong serial?, and the dialog it opens. Hovering or focusing the link
 * starts the read of the copies, so the dialog usually opens with them.
 */
function SubstituteAction({
  trade,
  item,
  senderName,
  completes,
}: {
  trade: TradeView;
  item: TradeItemView;
  senderName: string;
  completes: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const prefetch = () =>
    void queryClient
      .query(substituteCandidatesQuery(trade.id, item.id))
      .catch(noop);

  return (
    <>
      <button
        type="button"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => setOpen(true)}
        className="cursor-pointer text-xs text-muted-foreground underline decoration-muted-foreground/60 decoration-dashed underline-offset-2 hover:text-foreground hover:decoration-foreground focus-visible:text-foreground focus-visible:decoration-foreground focus-visible:outline-none"
      >
        {m.trade_page_substitute_button()}
      </button>
      <AcceptSubstituteDialog
        tradeId={trade.id}
        listingId={trade.listingId}
        item={item}
        name={senderName}
        completes={completes}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/**
 * One objekt's transfer. A narrow list, on phones or beside the admin
 * queue, puts its serial and time on a second line, and any action under
 * them. A copy its receiver accepted in place of the pinned serial shows
 * that copy's serial, the pinned one it stood in for and where it came from.
 */
function TransferRow({
  item,
  yours,
  senderName,
  action,
  problemAt,
}: {
  item: TradeItemView;
  /** whether the viewer sends it */
  yours: boolean;
  senderName: string;
  action: ReactNode;
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
      <ObjektThumbnail collection={item.collection} />
      {/* any action sits under the name as a quiet link, so the row's columns never move */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <div className="flex max-w-full min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 @lg:flex-nowrap">
          <span
            className="min-w-0 truncate font-medium @max-lg:basis-full"
            title={itemLabel(item)}
          >
            {itemLabel(item)}
          </span>
          {item.substitute === null ? (
            item.serial !== null && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {formatSerial(item.serial)}
              </span>
            )
          ) : (
            <>
              {item.substitute.serial !== null && (
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {formatSerial(item.substitute.serial)}
                </span>
              )}
              <span className="min-w-0 text-xs text-muted-foreground">
                <ParaglideMessage
                  message={m.trade_page_substitute_in_place_of}
                  inputs={{
                    pinned: pinnedLabel(item),
                  }}
                  markup={struck}
                />
                {" · "}
                <ParaglideMessage
                  message={m.trade_page_substitute_from}
                  inputs={{
                    name: substituteSourceName(
                      item.substitute.from,
                      senderName,
                    ),
                  }}
                  markup={plain}
                />
              </span>
            </>
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
        {action}
      </div>
      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums @max-lg:hidden">
        {when}
      </span>
      <ItemBadge
        {...(item.substitute === null ? statusBadges[status] : substituteBadge)}
      />
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

// the pinned serial an accepted copy stood in for, struck through
const struck = {
  s: ({ children }: { children?: ReactNode }) => (
    <s className="font-mono tabular-nums">{children}</s>
  ),
};

// a source's name in the row's own colour
const plain = {
  b: ({ children }: { children?: ReactNode }) => <>{children}</>,
};

// an objekt settled by a copy its receiver accepted in place of the pinned serial
const substituteBadge = {
  label: m.trade_page_item_substitute,
  className: tones.teal,
};

const statusBadges = {
  sent: {
    label: m.trade_page_item_sent,
    className: tones.teal,
  },
  arrived: {
    label: m.trade_page_item_arrived,
    className: "border-teal-500/40 text-teal-700 dark:text-teal-500",
  },
  waiting: {
    label: m.trade_page_item_waiting,
    className: tones.waiting,
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

// a payment's or an objekt's status at the end of its row
function ItemBadge({
  label,
  className,
}: {
  label: () => string;
  className: string;
}) {
  return (
    <Badge variant="outline" className={cn("shrink-0", className)}>
      {label()}
    </Badge>
  );
}
