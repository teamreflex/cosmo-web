import { m } from "@/i18n/messages";
import { reportReasonLabel } from "@/lib/client/reports";
import {
  itemName,
  partyName,
  tradeTimeFormat,
  txUrl,
} from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import { isOfferCloser, type TradeView } from "@/lib/universal/trades";
import type {
  OfferCloser,
  OfferEvent,
  TradeEvent,
  TradeSide,
} from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconExternalLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { bold } from "../notifications/row-utils";
import { Timestamp } from "../ui/timestamp";

/**
 * The event's sentence as the viewer reads it, naming the other party in
 * bold, or both parties for staff. Staff members are never named. The
 * timeline and the chat's markers both word events with it.
 */
export function describeEvent(
  trade: TradeView,
  side: TradeSide | null,
  event: TradeEvent,
): ReactNode {
  const appName = env.VITE_APP_NAME;
  const nameOf = (party: TradeSide) => partyName(trade.parties[party]);

  switch (event.type) {
    case "accepted":
      // an offer, one on a listing included, is accepted by the side that didn't propose it
      if (trade.proposedBy !== null) {
        return describeOfferEvent(trade, trade.proposedBy, side, event);
      }
      // a claim, which its claimer accepted on the poster's terms
      return side === null ? (
        <ParaglideMessage
          message={m.trade_page_event_accepted_staff}
          inputs={{ claimer: nameOf("to"), poster: nameOf("from") }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={
            side === "to"
              ? m.trade_page_event_accepted_you
              : m.trade_page_event_accepted_them
          }
          inputs={{ name: nameOf(otherSide(side)) }}
          markup={bold}
        />
      );
    case "item_transferred":
      return describeTransfer(trade, side, event);
    case "completed":
      return event.by === null
        ? m.trade_page_event_completed()
        : m.trade_page_event_completed_staff({ appName });
    case "cancelled":
      return event.by === "staff" ? (
        m.trade_page_event_cancelled_staff({ appName })
      ) : event.by === side ? (
        m.trade_page_event_cancelled_you()
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_cancelled_them}
          inputs={{ name: nameOf(event.by) }}
          markup={bold}
        />
      );
    case "disputed":
      return describeDispute(trade, side, event);
    case "deadline_extended":
      return (
        <ParaglideMessage
          message={
            side === null
              ? m.trade_page_event_extended_staff
              : m.trade_page_event_extended
          }
          inputs={{ appName, when: "" }}
          markup={{
            time: () => (
              <Timestamp
                date={new Date(event.deadlineAt)}
                format={tradeTimeFormat}
              />
            ),
          }}
        />
      );
    case "timed_out":
      return m.trade_page_event_timed_out();
    case "token_moved":
    case "token_untransferable": {
      const item = trade.items.find(({ tokenId }) => tokenId === event.tokenId);
      if (item === undefined) return null;
      const objekt = itemName(item);
      return event.type === "token_untransferable" ? (
        <ParaglideMessage
          message={m.trade_page_event_untransferable}
          inputs={{ objekt }}
          markup={bold}
        />
      ) : item.sender === side ? (
        <ParaglideMessage
          message={m.trade_page_event_moved_yours}
          inputs={{ objekt }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_moved_theirs}
          inputs={{ objekt, name: nameOf(item.sender) }}
          markup={bold}
        />
      );
    }
    case "message_removed":
      return m.trade_page_event_message_removed({ appName });
    case "feedback_removed":
      // a moderator removing a rating, naming whoever left it
      return event.side === side ? (
        m.trade_page_event_feedback_removed_rating_you({ appName })
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_feedback_removed_rating_them}
          inputs={{ appName, name: nameOf(event.side) }}
          markup={bold}
        />
      );
    // payments aren't implemented, so nothing writes these yet
    case "marked_paid":
    case "payment_confirmed":
      return null;
    default:
      // only a trade that started as an offer writes these
      return trade.proposedBy === null
        ? null
        : describeOfferEvent(trade, trade.proposedBy, side, event);
  }
}

/**
 * Which wording the viewer reads: `you` on `actor`'s side, `them` on its
 * other party's, and `staff`, which names both parties, for staff.
 */
function viewer(side: TradeSide | null, actor: TradeSide) {
  if (side === null) return "staff";
  return side === actor ? "you" : "them";
}

// an ending a ban, an account deletion or the listing closing caused, which names neither party
function closedEvent(by: OfferCloser) {
  switch (by) {
    case "staff":
      return m.trade_page_event_closed_staff({ appName: env.VITE_APP_NAME });
    case "deletion":
      return m.trade_page_event_closed_deletion();
    case "listing":
      return m.trade_page_event_closed_listing();
  }
}

/**
 * An offer's step 0, which `proposedBy` proposes and the other side
 * answers, and how it ended unaccepted, which a ban's closing puts down to
 * staff without naming who was banned, an account deletion's to the
 * deletion, and a listing's closing to the listing. An offer on a listing
 * says so where that reads differently.
 */
function describeOfferEvent(
  trade: TradeView,
  proposedBy: TradeSide,
  side: TradeSide | null,
  event: OfferEvent | { type: "accepted" },
): ReactNode {
  const answeredBy = otherSide(proposedBy);
  const sender = partyName(trade.parties[proposedBy]);
  const recipient = partyName(trade.parties[answeredBy]);
  const onListing = trade.listingId !== null;
  const linkTo =
    (id: string) =>
    ({ children }: { children?: ReactNode }) => (
      <Link
        to="/trade/$id"
        params={{ id }}
        className="text-cosmo hover:underline dark:text-cosmo-text"
      >
        {children}
      </Link>
    );

  switch (event.type) {
    case "offered":
      // a counter links back to the offer it answers
      return trade.parentId === null ? (
        <ParaglideMessage
          message={
            (onListing
              ? {
                  you: m.trade_page_event_offered_listing_you,
                  them: m.trade_page_event_offered_listing_them,
                  staff: m.trade_page_event_offered_listing_staff,
                }
              : {
                  you: m.trade_page_event_offered_you,
                  them: m.trade_page_event_offered_them,
                  staff: m.trade_page_event_offered_staff,
                })[viewer(side, proposedBy)]
          }
          inputs={{ sender, recipient }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={
            {
              you: m.trade_page_event_counter_offered_you,
              them: m.trade_page_event_counter_offered_them,
              staff: m.trade_page_event_counter_offered_staff,
            }[viewer(side, proposedBy)]
          }
          inputs={{ sender, recipient }}
          markup={{ ...bold, link: linkTo(trade.parentId) }}
        />
      );
    case "accepted":
      return (
        <ParaglideMessage
          message={
            (onListing
              ? {
                  you: m.trade_page_event_accepted_listing_offer_you,
                  them: m.trade_page_event_accepted_listing_offer_them,
                  staff: m.trade_page_event_accepted_listing_offer_staff,
                }
              : {
                  you: m.trade_page_event_accepted_offer_you,
                  them: m.trade_page_event_accepted_offer_them,
                  staff: m.trade_page_event_accepted_offer_staff,
                })[viewer(side, answeredBy)]
          }
          inputs={{ sender, recipient }}
          markup={bold}
        />
      );
    case "declined":
      if (isOfferCloser(event.by)) return closedEvent(event.by);
      return (
        <ParaglideMessage
          message={
            {
              you: m.trade_page_event_declined_you,
              them: m.trade_page_event_declined_them,
              staff: m.trade_page_event_declined_staff,
            }[viewer(side, event.by)]
          }
          inputs={{ sender, recipient }}
          markup={bold}
        />
      );
    case "withdrawn":
      if (isOfferCloser(event.by)) return closedEvent(event.by);
      return side === event.by ? (
        m.trade_page_event_withdrawn_you()
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_withdrawn_them}
          inputs={{ sender }}
          markup={bold}
        />
      );
    case "countered":
      return (
        <ParaglideMessage
          message={
            {
              you: m.trade_page_event_countered_you,
              them: m.trade_page_event_countered_them,
              staff: m.trade_page_event_countered_staff,
            }[viewer(side, answeredBy)]
          }
          inputs={{ sender, recipient }}
          markup={{ ...bold, link: linkTo(event.counterId) }}
        />
      );
    case "expired":
      return side === answeredBy ? (
        m.trade_page_event_expired_you()
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_expired_them}
          inputs={{ recipient }}
          markup={bold}
        />
      );
    case "stale":
      return describeStale(trade, side, event);
    default:
      return event satisfies never;
  }
}

/**
 * Why an offer went stale: the poster edited the listing it was on, which
 * is always their (`from`) side, or an offered objekt left its holder or
 * turned untransferable.
 */
function describeStale(
  trade: TradeView,
  side: TradeSide | null,
  event: Extract<OfferEvent, { type: "stale" }>,
): ReactNode {
  if (event.reason === "edited") {
    return side === "from" ? (
      m.trade_page_event_stale_edited_you()
    ) : (
      <ParaglideMessage
        message={m.trade_page_event_stale_edited_them}
        inputs={{ name: partyName(trade.parties.from) }}
        markup={bold}
      />
    );
  }
  const item = trade.items.find(({ tokenId }) => tokenId === event.tokenId);
  if (item === undefined) return null;
  return event.reason === "untransferable" ? (
    <ParaglideMessage
      message={m.trade_page_event_stale_untransferable}
      inputs={{ objekt: itemName(item) }}
      markup={bold}
    />
  ) : item.sender === side ? (
    <ParaglideMessage
      message={m.trade_page_event_stale_yours}
      inputs={{ objekt: itemName(item) }}
      markup={bold}
    />
  ) : (
    <ParaglideMessage
      message={m.trade_page_event_stale_theirs}
      inputs={{
        objekt: itemName(item),
        name: partyName(trade.parties[item.sender]),
      }}
      markup={bold}
    />
  );
}

/**
 * A dispute: a party's names its reason, while a ban's or a passed
 * deadline's reads as staff pausing the trade, never naming who was banned.
 */
function describeDispute(
  trade: TradeView,
  side: TradeSide | null,
  event: Extract<TradeEvent, { type: "disputed" }>,
) {
  const appName = env.VITE_APP_NAME;
  switch (event.by) {
    case "staff":
      return m.trade_page_event_disputed_staff({ appName });
    case "deadline":
      return m.trade_page_event_disputed_deadline({ appName });
    default:
      return event.by === side ? (
        m.trade_page_event_disputed_you({
          reason: reportReasonLabel(event.reason),
        })
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_disputed_them}
          inputs={{
            name: partyName(trade.parties[event.by]),
            reason: reportReasonLabel(event.reason),
          }}
          markup={bold}
        />
      );
  }
}

/**
 * An objekt the drain saw reach its receiver, with a link to the transfer.
 */
function describeTransfer(
  trade: TradeView,
  side: TradeSide | null,
  event: Extract<TradeEvent, { type: "item_transferred" }>,
) {
  const item = trade.items.find(({ id }) => id === event.itemId);
  if (item === undefined) return null;

  return (
    <>
      {/* "X reached @y" names the receiver, which also reads for staff */}
      {item.sender === side || side === null ? (
        <ParaglideMessage
          message={m.trade_page_event_sent_by_you}
          inputs={{
            objekt: itemName(item),
            name: partyName(trade.parties[otherSide(item.sender)]),
          }}
          markup={bold}
        />
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_sent_to_you}
          inputs={{ objekt: itemName(item) }}
          markup={bold}
        />
      )}{" "}
      <a
        href={txUrl(event.hash)}
        target="_blank"
        rel="noopener"
        aria-label={m.trade_page_view_transfer()}
        title={m.trade_page_view_transfer()}
        className="inline-flex align-middle text-muted-foreground hover:text-foreground"
      >
        <IconExternalLink className="size-3.5" />
      </a>
    </>
  );
}

// the reason staff gave for an action they took on the trade
export function eventNote(event: TradeEvent) {
  return "note" in event ? event.note : null;
}
