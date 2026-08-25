import type { RevealBatch } from "./reveals";

export type UseRevealsOptions = {
  pollId: number;
  startDate: string;
  endDate: string;
  aggregated: AggregatedGravityData;
};

export type LiveStatus = "upcoming" | "voting" | "live" | "finalized";

export type UseRevealsResult = {
  liveStatus: LiveStatus;
  isRefreshing: boolean;
  totalVotesCount: number;
  comoPerCandidate: number[];
  /** The last reveal batch this session saw; null unless counting is live. */
  latestBatch: RevealBatch | null;
  /** Every revealed vote, from the finalized payload or the polled pages. */
  reveals: Reveal[];
  remainingVotesCount: number;
  chartData: ChartSegment[];
  topVotes: AggregatedTopVote[];
  topUsers: AggregatedTopUser[];
};

/**
 * A revealed vote with its candidate and amount.
 */
export interface Reveal {
  id: string;
  candidateId: number;
  amount: number;
  /** ISO-8601, when the vote was cast — not when it was revealed */
  createdAt: string;
}

/**
 * Response from the aggregated gravity data endpoint.
 */
export interface AggregatedGravityData {
  chartData: ChartSegment[];
  topVotes: AggregatedTopVote[];
  topUsers: AggregatedTopUser[];
  totalVoteCount: number;
  totalComoCount: number;
  revealedVoteCount: number;
  /** Populated only for finalized polls (all votes revealed). Empty otherwise. */
  reveals: Reveal[];
  startDate: string;
  endDate: string;
}

export interface ChartSegment {
  timestamp: string;
  voteCount: number;
  totalTokenAmount: number;
}

export interface AggregatedTopVote {
  id: string;
  voter: string;
  comoAmount: number;
  candidateId: number | null;
  blockNumber: number;
  username: string | undefined;
}

export interface AggregatedTopUser {
  address: string;
  nickname: string | undefined;
  total: number;
  votes: {
    id: string;
    candidateId: number | null;
    amount: number;
    /** ISO-8601, when the vote was cast */
    createdAt: string;
  }[];
}
