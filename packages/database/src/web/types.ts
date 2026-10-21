import type {
  binderEntries,
  binders,
  collectionData,
  cosmoAccountChanges,
  cosmoAccounts,
  cosmoLinkAudit,
  cosmoTokens,
  eras,
  events,
  gravities,
  gravityPollCandidates,
  gravityPolls,
  notifications,
  objektListEntries,
  objektLists,
  pins,
  reportMessages,
  reports,
  staffAudit,
  tradeFeedback,
  tradeListingWants,
  tradeMessages,
  tradeOfferItems,
  tradeOffers,
  userFeedbackStats,
} from "./schema";

export type {
  CosmoGravityType,
  CosmoPollType,
} from "@apollo/cosmo/types/gravity";

export type CosmoAccount = typeof cosmoAccounts.$inferSelect;
export type CosmoAccountChange = typeof cosmoAccountChanges.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type ObjektList = typeof objektLists.$inferSelect;
export type ObjektListEntry = typeof objektListEntries.$inferSelect;
export type Binder = typeof binders.$inferSelect;
export type BinderEntry = typeof binderEntries.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

/**
 * A notification to insert (notifications_subject_chk). A list match names
 * an actor, their list and the collection they added. A trade notification
 * names the trade or listing it is about, the party who caused it (null when
 * staff or the system did), and the token for token events.
 */
export type NewNotification =
  | {
      type: ListMatchNotificationType;
      userId: string;
      actorId: string;
      listId: string;
      collectionId: string;
    }
  | {
      type: TradeNotificationType;
      userId: string;
      offerId: string;
      actorId: string | null;
      tokenId: number | null;
    };

// a trade notification before its recipient is filled in
export type NewTradeNotification = Omit<
  Extract<NewNotification, { type: TradeNotificationType }>,
  "userId"
>;

// the actor added something you want to their have list, or wants something on yours
export const listMatchNotificationTypes = ["trade_have", "trade_want"] as const;
export type ListMatchNotificationType =
  (typeof listMatchNotificationTypes)[number];

/**
 * Events on a trade or listing the recipient is part of. Each value keeps one
 * meaning for good, since a row's copy is rebuilt from it on every read.
 */
export const tradeNotificationTypes = [
  "listing_claimed",
  "trade_completed",
  "trade_timed_out",
  "trade_cancelled",
  "trade_disputed",
  "trade_dispute_resolved",
  "trade_deadline_extended",
  "listing_closed",
  "trade_message",
  "feedback_received",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "offer_countered",
  "offer_expired",
  "offer_stale",
] as const;
export type TradeNotificationType = (typeof tradeNotificationTypes)[number];

/**
 * Enum values nothing writes: a token in a trade moving elsewhere or turning
 * untransferable shows on the trade page instead. They stay in the enum until
 * the stack's migrations are consolidated (phase 16).
 */
const retiredNotificationTypes = [
  "trade_token_moved",
  "trade_token_untransferable",
] as const;

// in the enum's order; new values go at the end, so its migration is a plain ADD VALUE
export const notificationTypes = [
  ...listMatchNotificationTypes,
  "listing_claimed",
  "trade_completed",
  "trade_timed_out",
  "trade_cancelled",
  "trade_disputed",
  "trade_dispute_resolved",
  "trade_deadline_extended",
  ...retiredNotificationTypes,
  "listing_closed",
  "trade_message",
  "feedback_received",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "offer_countered",
  "offer_expired",
  "offer_stale",
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;
export type CollectionData = typeof collectionData.$inferSelect;
export type Era = typeof eras.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type StaffAudit = typeof staffAudit.$inferSelect;
export type CosmoLinkAudit = typeof cosmoLinkAudit.$inferSelect;
export type TradeOffer = typeof tradeOffers.$inferSelect;
export type TradeOfferItem = typeof tradeOfferItems.$inferSelect;
export type TradeListingWant = typeof tradeListingWants.$inferSelect;
export type NewTradeOfferItem = typeof tradeOfferItems.$inferInsert;
export type NewTradeListingWant = typeof tradeListingWants.$inferInsert;
export type TradeMessage = typeof tradeMessages.$inferSelect;
export type ReportMessage = typeof reportMessages.$inferSelect;
export type TradeFeedback = typeof tradeFeedback.$inferSelect;
export type UserFeedbackStats = typeof userFeedbackStats.$inferSelect;

export interface EventWithEra extends Event {
  era: Era;
}

export interface GravityWithPoll extends Gravity {
  pollStartDate: Date | null;
  pollEndDate: Date | null;
}

export const eventTypes = {
  // objekts available all season (First, Basic, Welcome class)
  seasonal: {
    value: "seasonal",
    label: "Seasonal",
  },
  // bundled in albums or are objekt music albums
  album: {
    value: "album",
    label: "Album",
  },
  // non-album merch such as seasons greetings
  merch: {
    value: "merch",
    label: "Merch",
  },
  // objekts sold at offline events such as concerts, fanmeetings etc
  offline: {
    value: "offline",
    label: "Offline",
  },
  // digital objekts purchased from the cosmo app shop
  shop: {
    value: "shop",
    label: "Shop",
  },
  // objekts given out as part of collaborations with brands
  collaboration: {
    value: "collaboration",
    label: "Collaboration",
  },
  // objekts given out as part of promotional campaigns
  promotional: {
    value: "promotional",
    label: "Promotional",
  },
  // objekts given out as part of tours, such as attendance rewards
  tour: {
    value: "tour",
    label: "Tour",
  },
} as const;
// SAFETY: Object.keys of a closed const object yields its literal keys
export const eventTypeKeys = Object.keys(
  eventTypes,
) as (keyof typeof eventTypes)[];
export type EventTypeKey = (typeof eventTypeKeys)[number];

export const reportTargetTypes = [
  "user",
  "message",
  "feedback",
  "trade",
] as const;
export type ReportTargetType = (typeof reportTargetTypes)[number];

// open and escalated count as open for the one-report-per-target rule
export const reportStatuses = [
  "open",
  "escalated",
  "resolved",
  "dismissed",
] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reportReasons = [
  "scam",
  "harassment",
  "impersonation",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof reportReasons)[number];

// why a party opened a dispute on a trade
export const disputeReasons = [
  "not_responding",
  "objekt_not_received",
  "payment_not_received",
  "off_terms",
  "other",
] as const;
export type DisputeReason = (typeof disputeReasons)[number];

// why a party reported a chat message
export const messageReportReasons = [
  "off_platform_payment",
  "harassment",
  "spam",
  "other",
] as const;
export type MessageReportReason = (typeof messageReportReasons)[number];

// why someone reported a rating
export const feedbackReportReasons = [
  "retaliation",
  "harassment",
  "personal_info",
  "spam",
  "other",
] as const;
export type FeedbackReportReason = (typeof feedbackReportReasons)[number];

/**
 * A stored report's reason: a user report's, a party dispute's, a chat
 * message or feedback report's, or `party_banned` for the dispute a ban
 * opens on each of the user's trades.
 */
export type StoredReportReason =
  | ReportReason
  | DisputeReason
  | MessageReportReason
  | FeedbackReportReason
  | "party_banned";

export const staffAuditActions = [
  "report:read",
  "report:resolve",
  "report:dismiss",
  "report:escalate",
  "user:ban",
  "user:unban",
  "user:set-role",
  "api-key:create",
  "api-key:update",
  "api-key:delete",
  "metadata:update",
  "trade:dispute",
  "trade:complete",
  "trade:cancel",
  "trade:extend",
  "trade:remove-message",
  "trade:message",
  "feedback:remove",
] as const;
export type StaffAuditAction = (typeof staffAuditActions)[number];

/**
 * A `collection` target's id is the collection's slug, a `message` target's
 * id is the chat message's id, and a `feedback` target's id is the rating's
 * id.
 */
export const staffAuditTargetTypes = [
  "user",
  "report",
  "api-key",
  "collection",
  "trade",
  "message",
  "feedback",
] as const;
export type StaffAuditTargetType = (typeof staffAuditTargetTypes)[number];

export const cosmoLinkEvents = ["linked", "unlinked"] as const;
export type CosmoLinkEvent = (typeof cosmoLinkEvents)[number];

/**
 * Why a COSMO link changed: the user proved control through the COSMO bio, or
 * deleted their account.
 */
export const cosmoLinkReasons = ["verified", "account-deleted"] as const;
export type CosmoLinkReason = (typeof cosmoLinkReasons)[number];

/**
 * Extra context for an audit row. Roles are stored as plain strings so this
 * package stays independent of @apollo/auth; readers parse them.
 * `expiresIn` is the ban length in seconds, null for a permanent ban. An API
 * key's name, owner and enabled state are copied in when the action runs, so
 * the row still reads after the key is deleted. A trade extension stores the
 * new deadline and the hours staff picked. A chat message staff removed or
 * sent, and a removed rating, name their trade.
 */
export type StaffAuditDetail =
  | { kind: "ban"; expiresIn: number | null; reason: string }
  | { kind: "set-role"; from: string; to: string }
  | {
      kind: "api-key";
      name: string | null;
      ownerId: string;
      enabled: boolean;
    }
  | { kind: "trade-extend"; deadlineAt: string; hours: number }
  | { kind: "message"; tradeId: string }
  | { kind: "feedback"; tradeId: string };

export const tradeOfferKinds = ["listing", "trade"] as const;
export type TradeOfferKind = (typeof tradeOfferKinds)[number];

/**
 * Every listing and trade status, in one enum. `trade_offers_status_chk`
 * ties each kind to its own subset below.
 */
export const tradeOfferStatuses = [
  "open",
  "claimed",
  "filled",
  "broken",
  "removed",
  "abandoned",
  "pending",
  "accepted",
  "disputed",
  "completed",
  "cancelled",
  "timed_out",
  "declined",
  "countered",
  "stale",
  "withdrawn",
  "expired",
] as const;
export type TradeOfferStatus = (typeof tradeOfferStatuses)[number];

/**
 * A listing is open until claimed, and filled when its trade completes.
 * Listings don't expire. One ends early when the poster withdraws it, an
 * offered token leaves the poster or turns untransferable (broken), staff
 * remove it, or the poster abandons a claim.
 */
export const listingStatuses = [
  "open",
  "claimed",
  "filled",
  "withdrawn",
  "broken",
  "removed",
  "abandoned",
] as const satisfies readonly TradeOfferStatus[];
export type ListingStatus = (typeof listingStatuses)[number];

/**
 * A direct offer is pending until the recipient answers it; a trade from a
 * listing starts accepted. `stale` is a pending offer whose token moved.
 */
export const tradeStatuses = [
  "pending",
  "accepted",
  "disputed",
  "completed",
  "cancelled",
  "timed_out",
  "declined",
  "withdrawn",
  "countered",
  "expired",
  "stale",
] as const satisfies readonly TradeOfferStatus[];
export type TradeStatus = (typeof tradeStatuses)[number];

// a trade whose tokens are reserved, which blocks either party's deletion
export const liveTradeStatuses = [
  "accepted",
  "disputed",
] as const satisfies readonly TradeStatus[];

// a trade still under way: a pending offer, or a live trade
export const openTradeStatuses = [
  "pending",
  ...liveTradeStatuses,
] as const satisfies readonly TradeStatus[];
export type OpenTradeStatus = (typeof openTradeStatuses)[number];

// how a trade ends: every item arrived, someone cancelled it, or it ran out of time
export const endedTradeStatuses = [
  "completed",
  "cancelled",
  "timed_out",
] as const satisfies readonly TradeStatus[];
export type EndedTradeStatus = (typeof endedTradeStatuses)[number];

// statuses nothing leaves, which set `ended_at`
export const endedStatuses = [
  "filled",
  "withdrawn",
  "expired",
  "broken",
  "removed",
  "abandoned",
  "completed",
  "cancelled",
  "timed_out",
  "declined",
  "countered",
  "stale",
] as const satisfies readonly TradeOfferStatus[];

// the poster (`from`) or the counterparty (`to`)
export const tradeSides = ["from", "to"] as const;
export type TradeSide = (typeof tradeSides)[number];

// what closed a pending offer for a party: staff banning them, or their account being deleted
export const offerClosers = ["staff", "deletion"] as const;
export type OfferCloser = (typeof offerClosers)[number];

// why a pending offer went stale: an offered token left its holder, or can't be transferred
export const staleReasons = ["moved", "untransferable"] as const;
export type StaleReason = (typeof staleReasons)[number];

export const tradeCancellers = ["from", "to", "staff"] as const;
export type TradeCanceller = (typeof tradeCancellers)[number];

export const tradeItemKinds = ["objekt", "payment"] as const;
export type TradeItemKind = (typeof tradeItemKinds)[number];

export const tradeWantKinds = ["exact", "range", "payment"] as const;
export type TradeWantKind = (typeof tradeWantKinds)[number];

export const tradeMessageKinds = ["text", "event"] as const;
export type TradeMessageKind = (typeof tradeMessageKinds)[number];

export const feedbackRatings = ["positive", "neutral", "negative"] as const;
export type FeedbackRating = (typeof feedbackRatings)[number];

/**
 * The rater's role on the trade: the payment's sender is the buyer and the
 * other side the seller, and a trade with no payment has two traders.
 */
export const feedbackRoles = ["buyer", "seller", "trader"] as const;
export type FeedbackRole = (typeof feedbackRoles)[number];

// how a listing with a payment side takes offers
export const listingOfferModes = [
  "price_or_offer",
  "price_only",
  "offer_only",
] as const;
export type ListingOfferMode = (typeof listingOfferModes)[number];

export const paymentMethods = [
  "paypal_ff",
  "wise",
  "bank_transfer",
  "promptpay",
  "kakaopay",
  "toss",
  "gcash",
  "alipay",
  "wechat_pay",
  "venmo",
  "cashapp",
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/**
 * A timeline event in a trade's message stream, rendered through i18n.
 * Times are ISO strings, since the payload is stored as jsonb. Staff actions
 * carry the moderator's note but never who took them, and a dispute opened
 * by a ban names staff rather than a party. `feedback_removed` names the
 * removed rating's rater.
 */
export type TradeEvent =
  | { type: "accepted" }
  | { type: "item_transferred"; itemId: number; hash: string }
  | { type: "marked_paid"; itemId: number }
  | { type: "payment_confirmed"; itemId: number }
  | { type: "completed"; by: null }
  | { type: "completed"; by: "staff"; note: string | null }
  | { type: "cancelled"; by: TradeSide }
  | { type: "cancelled"; by: "staff"; note: string | null }
  | {
      type: "disputed";
      by: TradeSide;
      reportId: string;
      reason: DisputeReason;
    }
  | { type: "disputed"; by: "staff"; reportId: string }
  | { type: "deadline_extended"; deadlineAt: string; note: string | null }
  | { type: "timed_out"; abandoned: TradeSide[] }
  | { type: "token_moved"; tokenId: number }
  | { type: "token_untransferable"; tokenId: number }
  | { type: "message_removed"; messageId: number }
  | { type: "feedback_removed"; side: TradeSide }
  | OfferEvent;

/**
 * The events only a direct offer writes: its sending, and how it ended
 * unaccepted. Accepting one writes `accepted`, as a listing claim does.
 */
export type OfferEvent =
  // a direct offer was sent
  | { type: "offered" }
  // the recipient turned the offer down, or it closed when they were banned or deleted their account
  | { type: "declined"; by: "to" | OfferCloser }
  // the sender took the offer back before an answer, or it closed when they were banned or deleted their account
  | { type: "withdrawn"; by: "from" | OfferCloser }
  // the recipient answered with the counter offer `counterId`
  | { type: "countered"; counterId: string }
  // nobody answered within the offer's 72 hours
  | { type: "expired" }
  // an offered token left its holder or turned untransferable before the offer was accepted
  | { type: "stale"; tokenId: number; reason: StaleReason };
