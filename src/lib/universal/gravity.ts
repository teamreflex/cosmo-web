import type { Vote } from "../server/db/indexer/schema";

export interface GravityVote extends Vote {
  amount: number;
}
