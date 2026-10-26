import {
  disputeReasons,
  offerClosers,
  staleReasons,
  tradeSides,
} from "@apollo/database/web/types";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { sanitizeMessage } from "./sanitize";

export const MAX_MESSAGE_LENGTH = 1000;

export const TradeId = Schema.String.check(Schema.isUUID());
export const ReportId = Schema.String.check(Schema.isUUID());
export const MessageId = Schema.Int.check(Schema.isGreaterThan(0));
export const TradeSide = Schema.Literals(tradeSides);

/**
 * Message text: sanitised as it is decoded, then 1 to MAX_MESSAGE_LENGTH
 * characters. Redacted, so logs, traces and decode errors print
 * `<redacted>`.
 */
export const MessageBody = Schema.Redacted(
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.String.check(
        Schema.isNonEmpty(),
        Schema.isMaxLength(MAX_MESSAGE_LENGTH),
      ),
      SchemaTransformation.transform({
        decode: sanitizeMessage,
        encode: (text) => text,
      }),
    ),
  ),
);

const StaffNote = Schema.NullOr(Schema.String);

// every stored trade event, as `TradeEvent` in @apollo/database types it
const KnownTradeEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("accepted") }),
  Schema.Struct({
    type: Schema.Literal("item_transferred"),
    itemId: Schema.Int,
    hash: Schema.String,
  }),
  Schema.Struct({ type: Schema.Literal("marked_paid"), itemId: Schema.Int }),
  Schema.Struct({
    type: Schema.Literal("payment_confirmed"),
    itemId: Schema.Int,
  }),
  Schema.Struct({ type: Schema.Literal("completed"), by: Schema.Null }),
  Schema.Struct({
    type: Schema.Literal("completed"),
    by: Schema.Literal("staff"),
    note: StaffNote,
  }),
  Schema.Struct({ type: Schema.Literal("cancelled"), by: TradeSide }),
  Schema.Struct({
    type: Schema.Literal("cancelled"),
    by: Schema.Literal("staff"),
    note: StaffNote,
  }),
  Schema.Struct({
    type: Schema.Literal("disputed"),
    by: TradeSide,
    reportId: Schema.String,
    reason: Schema.Literals(disputeReasons),
  }),
  Schema.Struct({
    type: Schema.Literal("disputed"),
    by: Schema.Literal("staff"),
    reportId: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("disputed"),
    by: Schema.Literal("deadline"),
    reportId: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("deadline_extended"),
    deadlineAt: Schema.String,
    note: StaffNote,
  }),
  Schema.Struct({ type: Schema.Literal("timed_out") }),
  Schema.Struct({ type: Schema.Literal("token_moved"), tokenId: Schema.Int }),
  Schema.Struct({
    type: Schema.Literal("token_untransferable"),
    tokenId: Schema.Int,
  }),
  Schema.Struct({
    type: Schema.Literal("message_removed"),
    messageId: Schema.Int,
  }),
  Schema.Struct({
    type: Schema.Literal("feedback_removed"),
    side: TradeSide,
  }),
  Schema.Struct({ type: Schema.Literal("offered") }),
  Schema.Struct({
    type: Schema.Literal("declined"),
    by: Schema.Literals(["to", ...offerClosers]),
  }),
  Schema.Struct({
    type: Schema.Literal("withdrawn"),
    by: Schema.Literals(["from", ...offerClosers]),
  }),
  Schema.Struct({
    type: Schema.Literal("countered"),
    counterId: Schema.String,
  }),
  Schema.Struct({ type: Schema.Literal("expired") }),
  Schema.Struct({
    type: Schema.Literal("stale"),
    tokenId: Schema.Int,
    reason: Schema.Literals(staleReasons),
  }),
]);

/**
 * An event kind this client doesn't know yet, from a newer server, kept so
 * the stream doesn't fail on it.
 */
const UnknownTradeEvent = Schema.Struct({ type: Schema.String });

export const ChatEvent = Schema.Union([KnownTradeEvent, UnknownTradeEvent]);

// whether a chat event is one this client knows how to show
export const isKnownEvent = Schema.is(KnownTradeEvent);

/**
 * Staff writing to both parties, named by their COSMO username or else
 * their Apollo username. `name` is null once their account is deleted.
 */
export const StaffSender = Schema.TaggedStruct("Staff", {
  name: Schema.NullOr(Schema.String),
});

export const isStaffSender = Schema.is(StaffSender);

export const MessageSender = Schema.Union([TradeSide, StaffSender]);
export type MessageSender = typeof MessageSender.Type;

/**
 * A text message. `sender` is null when a party's account is deleted.
 * `body` is null once staff removed it (`removed`) or retention blanked it.
 */
export const Message = Schema.TaggedStruct("Message", {
  id: MessageId,
  sender: Schema.NullOr(MessageSender),
  sentAt: Schema.Date,
  body: Schema.NullOr(MessageBody),
  removed: Schema.Boolean,
});

export const Event = Schema.TaggedStruct("Event", {
  id: MessageId,
  at: Schema.Date,
  event: ChatEvent,
});

export const ChatItem = Schema.Union([Message, Event]);
export type ChatItem = typeof ChatItem.Type;

/**
 * Follows the history a Join asked for: everything after it is live. A
 * client shows an empty chat, or knows it is back after a rejoin, from it.
 */
export const CaughtUp = Schema.TaggedStruct("CaughtUp", {});

export const JoinItem = Schema.Union([Message, Event, CaughtUp]);
export type JoinItem = typeof JoinItem.Type;
