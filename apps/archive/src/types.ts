import type { interactions, replayState } from "./schema";

export type Interaction = typeof interactions.$inferSelect;
export type InteractionInsert = typeof interactions.$inferInsert;
export type ReplayState = typeof replayState.$inferSelect;
