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
  reports,
  staffAudit,
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
 * A notification to insert. Every type names an actor, a list and a
 * collection (notifications_subject_chk).
 */
export type NewNotification = {
  type: "trade_have" | "trade_want";
  userId: string;
  actorId: string;
  listId: string;
  collectionId: string;
};
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
] as const;
export type StaffAuditAction = (typeof staffAuditActions)[number];

/**
 * A `collection` target's id is the collection's slug.
 */
export const staffAuditTargetTypes = [
  "user",
  "report",
  "api-key",
  "collection",
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
 * the row still reads after the key is deleted.
 */
export type StaffAuditDetail =
  | { kind: "ban"; expiresIn: number | null; reason: string }
  | { kind: "set-role"; from: string; to: string }
  | {
      kind: "api-key";
      name: string | null;
      ownerId: string;
      enabled: boolean;
    };
