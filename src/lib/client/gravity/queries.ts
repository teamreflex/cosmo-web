import { GravityHookParams } from "./types";

export const GRAVITY_QUERY_KEYS = {
  POLL_START_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-start-block",
    { tokenId: params.tokenId },
    Number(params.pollId),
  ],
  POLL_END_BLOCK: (params: GravityHookParams) => [
    "gravity",
    "poll-end-block",
    { tokenId: params.tokenId },
    Number(params.pollId),
  ],
  POLL_DETAILS: (params: GravityHookParams) => [
    "gravity",
    "poll-details",
    { tokenId: params.tokenId },
    Number(params.pollId),
  ],
} as const;
