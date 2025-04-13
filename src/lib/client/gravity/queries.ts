import { GravityHookParams } from "./types";

export const QUERY_KEYS = {
  POLL_START_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-start-block",
    params.contract,
    params.pollId,
  ],
  POLL_END_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-end-block",
    params.contract,
    params.pollId,
  ],
  VOTES: (params: GravityHookParams) => [
    "gravity",
    "votes",
    params.contract,
    params.pollId,
  ],
  REVEALS: (params: GravityHookParams) => [
    "gravity",
    "reveals",
    params.contract,
    params.pollId,
  ],
} as const;
