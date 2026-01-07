import type { RevealedVote } from "../types";

export type UseRevealsOptions = {
  pollId: number;
  startDate: string;
  endDate: string;
  aggregated: AggregatedGravityData;
};

export type LiveStatus = "upcoming" | "voting" | "live" | "finalized";

export type UseRevealsResult = {
  status: "success";
  liveStatus: LiveStatus;
  isRefreshing: boolean;
  totalVotesCount: number;
  comoPerCandidate: number[];
  remainingVotesCount: number;
  revealedVotes: RevealedVote[];
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
  }[];
}
