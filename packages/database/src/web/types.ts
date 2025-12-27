import type {
  collectionData,
  cosmoAccounts,
  cosmoAccountChanges,
  pins,
  cosmoTokens,
  gravities,
  gravityPolls,
  gravityPollCandidates,
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

export const eventTypes = [
  "album", // bundled in albums or are objekt music albums
  "offline", // objekts sold at offline events such as concerts, fanmeetings etc
  "shop", // digital objekts purchased from the cosmo app shop
  "collaboration", // objekts given out as part of collaborations with brands
  "promotional", // objekts given out as part of promotional campaigns
  "tour", // objekts given out as part of tours, such as attendance rewards
] as const;
export type EventType = (typeof eventTypes)[number];
