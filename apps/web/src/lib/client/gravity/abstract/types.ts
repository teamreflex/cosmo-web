import type { GravityHookParams } from "../common";
import type { RevealedVote } from "../types";

export interface UseChainDataOptions extends GravityHookParams {
  startDate: string;
  endDate: string;
  now: Date;
}

export type LiveStatus = "voting" | "live" | "finalized";

export type UseChainDataSuccess = {
  status: "success";
  liveStatus: LiveStatus;
  isRefreshing: boolean;
  totalVotesCount: number;
  comoPerCandidate: number[];
  remainingVotesCount: number;
  revealedVotes: RevealedVote[];
  // New fields for aggregated data
  chartData: ChartSegment[];
  topVotes: AggregatedTopVote[];
  topUsers: AggregatedTopUser[];
};

// Kept for backwards compatibility with components that check status
export type UseChainData = UseChainDataSuccess;

/**
 * Response from the aggregated gravity data endpoint.
 */
export interface AggregatedGravityData {
  chartData: ChartSegment[];
  topVotes: AggregatedTopVote[];
  topUsers: AggregatedTopUser[];
  totalVoteCount: number;
  revealedVoteCount: number;
  comoPerCandidate: number[];
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
