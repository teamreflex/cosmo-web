import { HttpClientResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import { decrypt, EncryptionError } from "../server/encryption";
import type { ValidArtist } from "../types/common";
import {
  bearer,
  cosmoClient,
  cosmoNoRetryClient,
  ValidArtistSchema,
} from "./http";

const CosmoByNicknameSchema = Schema.Struct({
  nickname: Schema.String,
  address: Schema.String,
  profileImageUrl: Schema.String,
  guid: Schema.String,
});

const CosmoSearchResultSchema = Schema.Struct({
  hasNext: Schema.Boolean,
  nextStartAfter: Schema.NullOr(Schema.String),
  results: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        id: Schema.Number,
        nickname: Schema.String,
        profileImageUrl: Schema.String,
        address: Schema.String,
        userProfiles: Schema.mutable(
          Schema.Array(
            Schema.Struct({
              artistId: ValidArtistSchema,
              artistName: ValidArtistSchema,
              image: Schema.Struct({
                original: Schema.String,
                thumbnail: Schema.String,
              }),
            }),
          ),
        ),
      }),
    ),
  ),
});

const CosmoUserProfileSchema = Schema.Struct({
  id: Schema.Number,
  nickname: Schema.String,
  address: Schema.String,
  profileImageUrl: Schema.String,
  fandomName: Schema.String,
  followDurationDays: Schema.Number,
  currentStreak: Schema.Number,
  statusMessage: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

/**
 * Fetch a user from COSMO by nickname. Not retried, since a failed lookup is meaningful to callers.
 */
export const fetchByNickname = Effect.fn("Cosmo.fetchByNickname")(function* (
  nickname: string,
) {
  const client = yield* cosmoNoRetryClient;
  return yield* client
    .get(`/bff/v3/users/by-nickname/${nickname}`)
    .pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(CosmoByNicknameSchema)),
      Effect.scoped,
    );
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
    .pipe(
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(CosmoSearchResultSchema),
      ),
      Effect.scoped,
    );
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
  const payload = yield* client
    .get(`/bff/v3/users/${userId}`, {
      headers: bearer(token),
      urlParams: { artistId },
    })
    .pipe(
      Effect.flatMap((response) => response.text),
      Effect.scoped,
    );

  const plaintext = yield* Effect.try({
    try: () => decrypt(payload, key),
    catch: (cause) =>
      new EncryptionError("Error decrypting payload", { cause }),
  });

  return yield* Schema.decodeUnknown(Schema.parseJson(CosmoUserProfileSchema))(
    plaintext,
  );
});
