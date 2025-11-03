import type {
  lists,
  listEntries,
  objektMetadata,
  cosmoAccounts,
  cosmoAccountChanges,
  pins,
  cosmoTokens,
  gravities,
  gravityPolls,
  gravityPollCandidates,
  objektListEntries,
  objektLists,
} from "./schema";

export type CosmoGravityType = "event-gravity" | "grand-gravity";
export type CosmoPollType = "single-poll" | "combination-poll";

export type CosmoAccount = typeof cosmoAccounts.$inferSelect;
export type CosmoAccountChange = typeof cosmoAccountChanges.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type ObjektList = typeof objektLists.$inferSelect;
export type ObjektListEntry = typeof objektListEntries.$inferSelect;
export type CosmoToken = typeof cosmoTokens.$inferSelect;
export type Gravity = typeof gravities.$inferSelect;
export type GravityPoll = typeof gravityPolls.$inferSelect;
export type GravityPollCandidate = typeof gravityPollCandidates.$inferSelect;
export type ObjektMetadataEntry = typeof objektMetadata.$inferSelect;

// legacy
export type List = typeof lists.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;
export type CreateList = typeof lists.$inferInsert;
export type UpdateList = typeof lists.$inferInsert;
