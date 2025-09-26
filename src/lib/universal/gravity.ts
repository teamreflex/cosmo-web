import type { Vote } from "../server/db/indexer/schema";

export interface GravityVote extends Vote {
  amount: number;
}

export class GravityNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GravityNotSupportedError";
  }
}
