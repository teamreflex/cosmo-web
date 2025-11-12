import { decodeJwt } from "jose";
import { Data, Effect } from "effect";
import { refresh } from "@apollo/cosmo/server/auth";
import { cosmoTokens } from "@apollo/database/web/schema";
import { DatabaseWeb } from "./db";

export class ProxiedToken extends Effect.Service<ProxiedToken>()(
  "app/ProxiedToken",
  {
    effect: Effect.gen(function* () {
      const db = yield* DatabaseWeb;

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

        const isAccessTokenValid = validateExpiry(latestToken.accessToken);
        if (isAccessTokenValid) {
          return { accessToken: latestToken.accessToken };
        }

        const isRefreshTokenValid = validateExpiry(latestToken.refreshToken);
        if (!isRefreshTokenValid) {
          return yield* new TokenRefreshError({
            cause: "Refresh token expired",
          });
        }

        const newTokens = yield* Effect.tryPromise({
          try: () => refresh(latestToken.refreshToken),
          catch: (cause) => new TokenRefreshError({ cause }),
        });

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
    dependencies: [DatabaseWeb.Default],
  },
) {}

/**
 * Validate JWT expiry by checking the exp claim.
 */
function validateExpiry(token: string): boolean {
  try {
    const claims = decodeJwt(token);
    return claims.exp !== undefined && claims.exp > Date.now() / 1000;
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
