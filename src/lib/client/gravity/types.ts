import { Hex } from "viem";

export type GravityHookParams = {
  contract: string | Hex;
  pollId: bigint;
};

export type VoteLog = {
  pollId: bigint;
  voteIndex: bigint;
  voter: `0x${string}`;
  comoAmount: bigint;
  hash: `0x${string}`;
  blockNumber: number;
};

export type RevealLog = {
  pollId: bigint;
  voteIndex: bigint;
  candidateId: bigint;
};

export type RevealedVote = {
  hash: string;
  pollId: number;
  voter: Hex;
  comoAmount: number;
  candidateId: number;
  blockNumber: number;
};

export type AggregatedVotes = {
  candidates: Record<
    number,
    {
      comoAmount: number;
      id: number;
      title: string;
      imageUrl: string;
    }
  >;
  address: string;
  nickname: string | undefined;
  total: number;
};
