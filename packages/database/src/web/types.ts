import type {
  collectionData,
  cosmoAccounts,
  cosmoAccountChanges,
  pins,
  binders,
  binderEntries,
  cosmoTokens,
  gravities,
  gravityPolls,
  gravityPollCandidates,
  notifications,
  objektListEntries,
  objektLists,
  eras,
  events,
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

export type ListMatchPayload = {
  sourceUserId: string;
  sourceListId: string;
  collectionId: string;
  direction: "they_added_have" | "they_added_want";
};

export type NotificationPayload = ListMatchPayload;
export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;
export type CollectionData = typeof collectionData.$inferSelect;
export type Era = typeof eras.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type StaffAudit = typeof staffAudit.$inferSelect;

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
  "listing",
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
  "cosmo-account:transfer",
] as const;
export type StaffAuditAction = (typeof staffAuditActions)[number];

/**
 * A `collection` target's id is the collection's slug, and a `cosmo-account`
 * target's id is the account's address.
 */
export const staffAuditTargetTypes = [
  "user",
  "report",
  "api-key",
  "collection",
  "cosmo-account",
] as const;
export type StaffAuditTargetType = (typeof staffAuditTargetTypes)[number];

/**
 * Extra context for an audit row. Roles are stored as plain strings so this
 * package stays independent of @apollo/auth; readers parse them.
 * `expiresIn` is the ban length in seconds, null for a permanent ban. An API
 * key's name, owner and enabled state, and a moved COSMO account's username,
 * are copied in when the action runs, so the row still reads after the key is
 * deleted or the account renamed.
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
  | {
      kind: "cosmo-transfer";
      username: string;
      fromUserId: string;
      toUserId: string;
    };
