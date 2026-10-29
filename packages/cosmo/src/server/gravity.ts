import { Effect } from "effect";
import {
  GravityListSchema,
  GravityResponseSchema,
  LiveVoteSchema,
  PollDetailResponseSchema,
} from "../schema/gravity";
import type { ValidArtist } from "../types/common";
import { bearer, cosmoClient, cosmoNoRetryClient, decodeBody } from "./http";

/**
 * Fetch the list of gravities for the given artist.
 */
export const fetchGravities = Effect.fn("Cosmo.fetchGravities")(function* (
  token: string,
  artistId: ValidArtist,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get("/bff/v3/gravities", {
      headers: bearer(token),
      urlParams: { artistId },
    })
    .pipe(Effect.flatMap(decodeBody(GravityListSchema)));
});

/**
 * Fetch a single gravity.
 */
export const fetchGravity = Effect.fn("Cosmo.fetchGravity")(function* (
  token: string,
  gravityId: number,
) {
  const client = yield* cosmoClient;
  const response = yield* client
    .get(`/bff/v3/gravities/${gravityId}`, { headers: bearer(token) })
    .pipe(Effect.flatMap(decodeBody(GravityResponseSchema)));
  return response.gravity;
});

/**
 * Fetch the poll fields.
 */
export const fetchPoll = Effect.fn("Cosmo.fetchPoll")(function* (
  token: string,
  pollId: number,
) {
  const client = yield* cosmoClient;
  const response = yield* client
    .get(`/bff/v3/polls/${pollId}`, { headers: bearer(token) })
    .pipe(Effect.flatMap(decodeBody(PollDetailResponseSchema)));
  return response.pollDetail;
});

/**
 * Fetch a poll's running per-choice totals. Unauthenticated, and a 404 means
 * COSMO hasn't published live totals for the poll.
 */
export const fetchLiveVote = Effect.fn("Cosmo.fetchLiveVote")(function* (
  pollId: number,
) {
  const client = yield* cosmoNoRetryClient;
  return yield* client
    .get(`/bff/v4/gravity-polls/${pollId}/live-vote`)
    .pipe(Effect.flatMap(decodeBody(LiveVoteSchema)));
});
