import type {
  comoBalances,
  collections,
  objekts,
  transfers,
  votes,
} from "./schema";

export type Transfer = typeof transfers.$inferSelect;
export type Objekt = typeof objekts.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type ComoBalance = typeof comoBalances.$inferSelect;
export type Vote = typeof votes.$inferSelect;
