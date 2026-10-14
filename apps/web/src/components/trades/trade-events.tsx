import { m } from "@/i18n/messages";
import { reportReasonLabel } from "@/lib/client/reports";
import {
  itemName,
  partyName,
  tradeTimeFormat,
  txUrl,
} from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import type { TradeView } from "@/lib/universal/trades";
import type { TradeEvent, TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconExternalLink } from "@tabler/icons-react";
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
      // the claimer is always the side that accepts a listing
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
      if (event.by === "staff") {
        return m.trade_page_event_disputed_staff({ appName });
      }
      return event.by === side ? (
        m.trade_page_event_disputed_you({
          reason: reportReasonLabel(event.reason),
        })
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_disputed_them}
          inputs={{
            name: nameOf(event.by),
            reason: reportReasonLabel(event.reason),
          }}
          markup={bold}
        />
      );
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
      return event.abandoned.length > 1 ? (
        side === null ? (
          m.trade_page_timed_out_both_staff()
        ) : (
          m.trade_page_event_timed_out_both()
        )
      ) : side !== null && event.abandoned.includes(side) ? (
        m.trade_page_event_timed_out_you()
      ) : (
        <ParaglideMessage
          message={m.trade_page_event_timed_out_them}
          inputs={{
            name: nameOf(event.abandoned.includes("from") ? "from" : "to"),
          }}
          markup={bold}
        />
      );
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
    // the payment side arrives in phase 13a
    case "marked_paid":
    case "payment_confirmed":
      return null;
    default:
      return event satisfies never;
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
