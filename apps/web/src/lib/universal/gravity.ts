import type { Vote } from "../server/db/indexer/schema";

export interface GravityVote extends Omit<
  Vote,
  "tokenId" | "logIndex" | "hash" | "pollId"
> {
  amount: number;
  username: string | undefined;
}

export class GravityNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GravityNotSupportedError";
  }
}
