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
  /** Revealed COMO per chart segment, from the finalized payload or the polled pages. */
  revealed: RevealedSegments;
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
  /** Populated only for finalized polls (all votes revealed). Null otherwise. */
  finalized: FinalizedReveals | null;
  startDate: string;
  endDate: string;
}

/**
 * A finalized poll's reveals, summed server-side so the payload doesn't
 * carry every vote.
 */
export interface FinalizedReveals {
  /** COMO per candidate id, indexed by candidate id. Ids with no reveals hold 0. */
  comoPerCandidate: number[];
  /** Every candidate with a revealed vote inside the chart, by candidate id. */
  segments: CandidateSegments[];
}

/**
 * One candidate's revealed COMO per chart segment, aligned with `chartData`.
 */
export interface CandidateSegments {
  candidateId: number;
  amounts: number[];
}

/**
 * Revealed COMO bucketed into chart segments, per candidate id.
 */
export interface RevealedSegments {
  /** Votes revealed so far; zero means there is nothing to draw. */
  revealCount: number;
  /** Candidate id to COMO per segment, for candidates with a vote inside the chart. */
  amounts: Map<number, number[]>;
  /** Index of the last segment holding a revealed vote, or -1 when none do. */
  frontierSegmentIndex: number;
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
