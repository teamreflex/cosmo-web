import { Gravity, GravityPoll } from "../server/db/schema";

export interface GravityResult extends Gravity {
  polls: PollResult[];
}

export interface PollResult extends GravityPoll {
  votes: VoteResult[];
}

export type VoteResult = {
  id: string;
  createdAt: Date;
  amount: number;
  candidate: string | undefined;
};
