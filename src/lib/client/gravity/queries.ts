import { GravityHookParams } from "./types";

export const GRAVITY_QUERY_KEYS = {
  POLL_START_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-start-block",
    params.contract,
    Number(params.pollId),
  ],
  POLL_END_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-end-block",
    params.contract,
    Number(params.pollId),
  ],
  VOTES: (params: GravityHookParams) => [
    "gravity",
    "votes",
    params.contract,
    Number(params.pollId),
  ],
  REVEALS: (params: GravityHookParams) => [
    "gravity",
    "reveals",
    params.contract,
    Number(params.pollId),
  ],
  POLL_DETAILS: (params: GravityHookParams) => [
    "gravity",
    "poll-details",
    params.contract,
    Number(params.pollId),
  ],
  VOTER_NAMES: (params: GravityHookParams) => [
    "gravity",
    "voter-names",
    params.contract,
    Number(params.pollId),
  ],
} as const;
