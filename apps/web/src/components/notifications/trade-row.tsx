import { m } from "@/i18n/messages";
import { formatAmount, offerSideText } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { tradeQuery, tradesKey } from "@/lib/queries/trades";
import type {
  NotificationListItem,
  NotificationToken,
} from "@/lib/universal/notifications";
import type { TradePart } from "@apollo/trades/lifecycle";
import { accountName, formatSerial } from "@apollo/util";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconTagOff } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RowAvatar, RowBody } from "./row-parts";
import { bold, rowClassName } from "./row-utils";

type TradeItem = Extract<NotificationListItem, { kind: "trade" }>;

/**
 * A trade notification links to its trade, and opening it refreshes that
 * trade and marks every other trade query stale, so My trades and its
 * needs-you counts refetch when next shown. A closed listing's links to the
 * listing.
 */
export default function TradeRow({
  notification,
  onOpen,
}: {
  notification: TradeItem;
  onOpen: () => void;
}) {
  const { counterparty, objekts, token, offer } = notification;
  const queryClient = useQueryClient();
  // trade pages name a deleted or nicknameless counterparty the same way
  const name = counterparty?.username ?? null;
  const username = name === null ? m.common_deleted_user() : accountName(name);
  const shown = token ?? (objekts.length === 1 ? objekts[0] : undefined);
  const content = (
    <RowBody
      leading={
        notification.type === "listing_closed" ? (
          // a closed listing has no other party, so its icon stands in
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-600 dark:text-amber-400">
            <IconTagOff className="size-4" />
          </div>
        ) : (
          <RowAvatar
            user={
              counterparty === null
                ? null
                : { username, avatar: counterparty.avatar }
            }
            type={notification.type}
          />
        )
      }
      sentence={describeTrade(notification, username)}
      lastAt={notification.lastAt}
      single={shown?.collection}
      strip={
        objekts.length > 1
          ? {
              collections: objekts.flatMap((o) =>
                o.collection === null ? [] : [o.collection],
              ),
              itemCount: objekts.length,
            }
          : null
      }
      unread={notification.unread}
    />
  );

  const closed = notification.type === "listing_closed";
  return (
    <Link
      to={closed ? "/market/listing/$id" : "/trade/$id"}
      params={{ id: offer.id }}
      // the click refetches the trade, so a hover preload would fetch it twice
      preload={closed ? undefined : false}
      onClick={() => {
        onOpen();
        if (!closed) {
          void queryClient.invalidateQueries({
            queryKey: tradeQuery(offer.id).queryKey,
          });
          void queryClient.invalidateQueries({
            queryKey: tradesKey,
            refetchType: "none",
          });
        }
      }}
      data-unread={notification.unread}
      className={rowClassName}
    >
      {content}
    </Link>
  );
}

// "Atom02 HeeJin 201Z #00217", or less when the indexer has lost it
function tokenName(token: NotificationToken | null | undefined) {
  if (!token?.collection) return m.notification_unknown_objekt();
  return token.serial === null
    ? token.collection.name
    : `${token.collection.name} ${formatSerial(token.serial)}`;
}

/**
 * New chat messages, from the other party or from a named staff member.
 */
function describeMessage(actor: TradeItem["actor"], username: string) {
  const appName = env.VITE_APP_NAME;
  if (actor?.kind !== "staff") {
    return (
      <ParaglideMessage
        message={m.notification_trade_message}
        inputs={{ username }}
        markup={bold}
      />
    );
  }
  return actor.name === null ? (
    <ParaglideMessage
      message={m.notification_trade_message_staff_unnamed}
      inputs={{ appName, username }}
      markup={bold}
    />
  ) : (
    <ParaglideMessage
      message={m.notification_trade_message_staff}
      inputs={{ appName, staff: accountName(actor.name), username }}
      markup={bold}
    />
  );
}

/**
 * The row's sentence for each trade type. A null actor means staff or the
 * system acted, which never names who.
 */
function describeTrade(notification: TradeItem, username: string) {
  const appName = env.VITE_APP_NAME;
  const staff = notification.actor === null;

  switch (notification.type) {
    case "listing_claimed":
      return describeClaimed(notification, username);
    case "trade_completed":
      return (
        <ParaglideMessage
          message={m.notification_trade_completed}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_timed_out":
      return (
        <ParaglideMessage
          message={m.notification_trade_timed_out}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_cancelled":
      return staff ? (
        <ParaglideMessage
          message={m.notification_trade_cancelled_staff}
          inputs={{ appName, username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_cancelled}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_disputed":
      return staff ? (
        <ParaglideMessage
          message={m.notification_trade_disputed_staff}
          inputs={{ appName, username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.notification_trade_disputed}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_dispute_resolved":
      return (
        <ParaglideMessage
          message={
            notification.offer.status === "cancelled"
              ? m.notification_trade_dispute_resolved_cancelled
              : m.notification_trade_dispute_resolved_completed
          }
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_deadline_extended":
      return (
        <ParaglideMessage
          message={m.notification_trade_deadline_extended}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "trade_message":
      return describeMessage(notification.actor, username);
    case "feedback_received":
      return (
        <ParaglideMessage
          message={m.notification_feedback_received}
          inputs={{ username }}
          markup={bold}
        />
      );
    // a listing closes without a token when a trade ending left too few objekts for another
    case "listing_closed":
      return notification.token === null ? (
        m.notification_listing_closed_too_few()
      ) : (
        <ParaglideMessage
          message={m.notification_listing_closed}
          inputs={{ objekt: tokenName(notification.token) }}
          markup={bold}
        />
      );
    case "offer_received":
      return describeOfferReceived(notification, username);
    case "offer_accepted":
      return describeOfferAccepted(notification, username);
    /**
     * Staff close the offers a banned user received, never saying who was
     * banned, and an offer on a listing closes with the listing.
     */
    case "offer_declined":
      return notification.closer === "listing" ? (
        <ParaglideMessage
          message={m.notification_offer_declined_listing_closed}
          inputs={{ username }}
          markup={bold}
        />
      ) : staff ? (
        <ParaglideMessage
          message={m.notification_offer_declined_staff}
          inputs={{ appName, username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={
            notification.fromListing
              ? m.notification_offer_declined_listing
              : m.notification_offer_declined
          }
          inputs={{ username }}
          markup={bold}
        />
      );
    case "offer_countered":
      return (
        <ParaglideMessage
          message={m.notification_offer_countered}
          inputs={{ username }}
          markup={bold}
        />
      );
    case "offer_expired":
      return (
        <ParaglideMessage
          message={
            notification.fromListing
              ? m.notification_offer_expired_listing
              : m.notification_offer_expired
          }
          inputs={{ username }}
          markup={bold}
        />
      );
    // an offer goes stale without a token when the poster edits the listing it was on
    case "offer_stale":
      return notification.token === null ? (
        <ParaglideMessage
          message={m.notification_offer_stale_edited}
          inputs={{ username }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={
            notification.tokenYours
              ? m.notification_offer_stale_yours
              : m.notification_offer_stale_theirs
          }
          inputs={{ username, objekt: tokenName(notification.token) }}
          markup={bold}
        />
      );
    default:
      notification.type satisfies never;
      return null;
  }
}

/**
 * A claim on the recipient's listing: what they send, and what they pay
 * when their payment is on top of their objekts, or what they pay alone on
 * a buy listing.
 */
function describeClaimed(notification: TradeItem, username: string) {
  const { objekts, payment, yourPart } = notification;
  if (payment !== null && yourPart === "pay") {
    return (
      <ParaglideMessage
        message={m.notification_listing_claimed_buying}
        inputs={{
          username,
          amount: formatAmount(payment.amount, payment.currency),
        }}
        markup={bold}
      />
    );
  }
  const sent =
    objekts.length === 1
      ? tokenName(objekts[0])
      : m.notification_objekts_count({ count: objekts.length });
  // a poster who pays on top of their objekts hears what to pay too
  return payment !== null && yourPart === "send_pay" ? (
    <ParaglideMessage
      message={m.notification_listing_claimed_pay}
      inputs={{
        username,
        objekts: sent,
        amount: formatAmount(payment.amount, payment.currency),
      }}
      markup={bold}
    />
  ) : (
    <ParaglideMessage
      message={m.notification_listing_claimed}
      inputs={{ username, objekts: sent }}
      markup={bold}
    />
  );
}

/**
 * An offer sent to the recipient: each side's objekt count, with the
 * payment beside the side that sends it.
 */
function describeOfferReceived(notification: TradeItem, username: string) {
  return notification.payment === null ? (
    <ParaglideMessage
      message={
        notification.fromListing
          ? m.notification_offer_received_listing
          : m.notification_offer_received
      }
      inputs={{
        username,
        offered: notification.objekts.length,
        asked: notification.asked,
      }}
      markup={bold}
    />
  ) : (
    /**
     * Only an offer on a listing carries a payment, and its claimer
     * proposes it: a `to` payment is theirs, a `from` one the poster's
     * on top.
     */
    <ParaglideMessage
      message={m.notification_offer_received_listing_terms}
      inputs={{
        username,
        offered: offerSideText(
          notification.objekts.length,
          notification.payment.sender === "to" ? notification.payment : null,
        ),
        asked: offerSideText(
          notification.asked,
          notification.payment.sender === "from" ? notification.payment : null,
        ),
      }}
      markup={bold}
    />
  );
}

// what an accepted offer's proposer hears they pay, alone or beside their objekts
const acceptedPayments = {
  pay: m.notification_offer_accepted_listing_pay,
  send_pay: m.notification_offer_accepted_listing_send_pay,
} satisfies Record<
  Exclude<TradePart, "send">,
  (inputs: { username: string; amount: string }) => string
>;

/**
 * The recipient's offer accepted: a claimer who owes the payment hears
 * what to pay, beside any objekts they send.
 */
function describeOfferAccepted(notification: TradeItem, username: string) {
  const { payment, yourPart } = notification;
  return payment !== null && yourPart !== null && yourPart !== "send" ? (
    <ParaglideMessage
      message={acceptedPayments[yourPart]}
      inputs={{
        username,
        amount: formatAmount(payment.amount, payment.currency),
      }}
      markup={bold}
    />
  ) : (
    <ParaglideMessage
      message={
        notification.fromListing
          ? m.notification_offer_accepted_listing
          : m.notification_offer_accepted
      }
      inputs={{ username }}
      markup={bold}
    />
  );
}
