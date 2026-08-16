import { refreshV3 } from "@apollo/cosmo/server/auth";
import { cosmoTokens } from "@apollo/database/web/schema";
import { Clock, Context, Data, Effect, Layer } from "effect";
import { decodeJwt } from "jose";
import { CosmoKey } from "./cosmo-key";
import { DatabaseWeb } from "./db";

export class ProxiedToken extends Context.Service<ProxiedToken>()(
  "app/ProxiedToken",
  {
    make: Effect.gen(function* () {
      const db = yield* DatabaseWeb;
      const cosmoKey = yield* CosmoKey;

      /**
       * Get the latest COSMO token from the database, refresh if necessary.
       */
      const get = Effect.gen(function* () {
        const latestToken = yield* Effect.tryPromise({
          try: () =>
            db.query.cosmoTokens.findFirst({
              orderBy: { id: "desc" },
            }),
          catch: (cause) => new TokenFetchError({ cause }),
        });

        if (!latestToken) {
          return yield* new NoTokenFoundError();
        }

        const nowMillis = yield* Clock.currentTimeMillis;

        const isAccessTokenValid = validateExpiry(
          latestToken.accessToken,
          nowMillis,
        );
        if (isAccessTokenValid) {
          return { accessToken: latestToken.accessToken };
        }

        const isRefreshTokenValid = validateExpiry(
          latestToken.refreshToken,
          nowMillis,
        );
        if (!isRefreshTokenValid) {
          return yield* new TokenRefreshError({
            cause: "Refresh token expired",
          });
        }

        const key = yield* cosmoKey.get;
        const newTokens = yield* refreshV3(latestToken.refreshToken, key);

        const [newToken] = yield* Effect.tryPromise({
          try: () =>
            db
              .insert(cosmoTokens)
              .values({
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
              })
              .returning(),
          catch: (cause) => new TokenStoreError({ cause }),
        });

        if (!newToken) {
          return yield* new TokenStoreError({
            cause: "Insert returned no rows",
          });
        }

        return { accessToken: newToken.accessToken };
      });

      return { get };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide([DatabaseWeb.layer, CosmoKey.layer]),
  );
}

/**
 * Validate JWT expiry by checking the exp claim.
 */
function validateExpiry(token: string, nowMillis: number): boolean {
  try {
    const claims = decodeJwt(token);
    return claims.exp !== undefined && claims.exp > nowMillis / 1000;
  } catch {
    return false;
  }
}

/**
 * Database contains no tokens at all.
 */
export class NoTokenFoundError extends Data.TaggedError(
  "NoTokenFoundError",
)<{}> {}

/**
 * Failed to fetch token from database.
 */
export class TokenFetchError extends Data.TaggedError("TokenFetchError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to refresh the token with the API.
 */
export class TokenRefreshError extends Data.TaggedError("TokenRefreshError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to store new token in database.
 */
export class TokenStoreError extends Data.TaggedError("TokenStoreError")<{
  readonly cause: unknown;
}> {}
