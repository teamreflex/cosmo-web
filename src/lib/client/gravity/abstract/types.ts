export type GravityHookParams = {
  tokenId: bigint;
  pollId: bigint;
};

export interface UseChainDataOptions extends GravityHookParams {
  startDate: string;
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

export type UseChainDataSuccess = {
  status: "success";
  isLive: boolean;
  totalVotesCount: number;
  comoPerCandidate: number[];
  remainingVotesCount: number;
};

export type UseChainData =
  | UseChainDataPending
  | UseChainDataError
  | UseChainDataSuccess;
