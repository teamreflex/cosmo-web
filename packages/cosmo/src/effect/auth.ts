import { HttpBody } from "@effect/platform";
import { Effect, Schema } from "effect";
import { encrypt, EncryptionError } from "../server/encryption";
import { cosmoClient, decodeBody } from "./http";

const RefreshResponseSchema = Schema.Struct({
  credentials: Schema.Struct({
    refreshToken: Schema.String,
    accessToken: Schema.String,
  }),
});

/**
 * Refresh the given token.
 * @deprecated use refreshV3
 */
export const refresh = Effect.fn("Cosmo.refresh")(function* (
  refreshToken: string,
) {
  const client = yield* cosmoClient;
  const response = yield* client
    .post("/auth/v1/refresh", {
      body: HttpBody.unsafeJson({ refreshToken }),
    })
    .pipe(
      Effect.flatMap(decodeBody(RefreshResponseSchema)),
      Effect.scoped,
    );
  return response.credentials;
});

/**
 * Refresh the given token, encrypting the payload with the COSMO key.
 */
export const refreshV3 = Effect.fn("Cosmo.refreshV3")(function* (
  refreshToken: string,
  key: string,
) {
  const body = yield* Effect.try({
    try: () => encrypt(JSON.stringify({ refreshToken }), key),
    catch: (cause) =>
      new EncryptionError("Error encrypting payload", { cause }),
  });

  const client = yield* cosmoClient;
  const response = yield* client
    .post("/bff/v3/users/refresh-access-token", {
      body: HttpBody.text(body, "text/plain"),
      headers: {
        "x-cosmo-encrypted": "1",
      },
    })
    .pipe(
      Effect.flatMap(decodeBody(RefreshResponseSchema)),
      Effect.scoped,
    );
  return response.credentials;
});
