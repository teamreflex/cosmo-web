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
  collectionWatches,
  notifications,
  objektListEntries,
  objektLists,
  eras,
  events,
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
 * collection (notifications_subject_chk); a sale also names the listed entry.
 */
export type NewNotification = {
  userId: string;
  actorId: string;
  listId: string;
  collectionId: string;
} & (
  | { type: "trade_have" | "trade_want" }
  | { type: "sale_listed"; entryId: string }
);
export type CollectionWatch = typeof collectionWatches.$inferSelect;

export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;
export type CollectionData = typeof collectionData.$inferSelect;
export type Era = typeof eras.$inferSelect;
export type Event = typeof events.$inferSelect;

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
