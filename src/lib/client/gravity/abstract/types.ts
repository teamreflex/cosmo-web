import type { GravityHookParams } from "../common";

export interface UseChainDataOptions extends GravityHookParams {
  startDate: string;
  endDate: string;
}

type UseBlockStatusPending = {
  isPending: true;
};

type UseBlockStatusSuccess = {
  isPending: false;
  startBlock: number;
  endBlock: number | null;
};

export type UseBlockStatus = UseBlockStatusPending | UseBlockStatusSuccess;

export type UseChainDataPending = {
  status: "pending";
};

export type UseChainDataError = {
  status: "error";
  error: string;
};

export type LiveStatus = "voting" | "live" | "finalized";

export type UseChainDataSuccess = {
  status: "success";
  liveStatus: LiveStatus;
  isRefreshing: boolean;
  totalVotesCount: number;
  comoPerCandidate: number[];
  remainingVotesCount: number;
};

export type UseChainData =
  | UseChainDataPending
  | UseChainDataError
  | UseChainDataSuccess;
