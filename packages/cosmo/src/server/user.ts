import { Effect, Schema } from "effect";
import { CosmoDecodeError } from "../errors";
import {
  CosmoByNicknameSchema,
  CosmoSearchResultSchema,
  CosmoUserProfileSchema,
} from "../schema/user";
import type { ValidArtist } from "../types/common";
import { decrypt, EncryptionError } from "./encryption";
import {
  bearer,
  cosmoClient,
  cosmoNoRetryClient,
  decodeBody,
  toApiError,
} from "./http";

/**
 * Fetch a user from COSMO by nickname. Not retried, since a failed lookup is meaningful to callers.
 */
export const fetchByNickname = Effect.fn("Cosmo.fetchByNickname")(function* (
  nickname: string,
) {
  const client = yield* cosmoNoRetryClient;
  return yield* client
    .get(`/bff/v3/users/by-nickname/${nickname}`)
    .pipe(Effect.flatMap(decodeBody(CosmoByNicknameSchema)));
});

/**
 * Search for the given user.
 */
export const search = Effect.fn("Cosmo.search")(function* (
  token: string,
  term: string,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get("/bff/v3/users/search", {
      headers: bearer(token),
      urlParams: {
        nickname: term,
        skip: "0",
        take: "100",
      },
    })
    .pipe(Effect.flatMap(decodeBody(CosmoSearchResultSchema)));
});

/**
 * Fetch a user's public profile. The response body is encrypted with the COSMO key.
 */
export const fetchUserProfile = Effect.fn("Cosmo.fetchUserProfile")(function* (
  token: string,
  key: string,
  userId: number,
  artistId: ValidArtist,
) {
  const client = yield* cosmoClient;
  return yield* client
    .get(`/bff/v3/users/${userId}`, {
      headers: bearer(token),
      urlParams: { artistId },
    })
    .pipe(
      Effect.flatMap((response) =>
        response.text.pipe(
          Effect.mapError(toApiError),
          Effect.flatMap((payload) =>
            Effect.try({
              try: () => decrypt(payload, key),
              catch: (cause) =>
                new EncryptionError("Error decrypting payload", { cause }),
            }),
          ),
          Effect.flatMap((plaintext) =>
            Schema.decodeUnknownEffect(
              Schema.fromJsonString(CosmoUserProfileSchema),
            )(plaintext).pipe(
              Effect.mapError(
                (cause) =>
                  new CosmoDecodeError({ url: response.request.url, cause }),
              ),
            ),
          ),
        ),
      ),
    );
});
