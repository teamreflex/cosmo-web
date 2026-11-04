import { refreshV3 } from "@apollo/cosmo/server/auth";
import { cosmoTokens } from "@apollo/database/web/schema";
import { DatabaseWeb } from "@apollo/services/database-web";
import { Clock, Context, Data, Effect, Layer, Schema } from "effect";
import { Jwt } from "effect/jose";
import { CosmoKey } from "./cosmo-key";

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
        const latestToken = yield* db.query.cosmoTokens.findFirst({
          orderBy: { id: "desc" },
        });

        if (!latestToken) {
          return yield* new NoTokenFoundError();
        }

        const nowMillis = yield* Clock.currentTimeMillis;

        if (yield* validateExpiry(latestToken.accessToken, nowMillis)) {
          return { accessToken: latestToken.accessToken };
        }

        if (!(yield* validateExpiry(latestToken.refreshToken, nowMillis))) {
          return yield* new TokenRefreshError({
            cause: "Refresh token expired",
          });
        }

        const key = yield* cosmoKey.get;
        const newTokens = yield* refreshV3(latestToken.refreshToken, key);

        const [newToken] = yield* db
          .insert(cosmoTokens)
          .values({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          })
          .returning();

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
    Layer.provide(CosmoKey.layer),
  );
}

const Expiry = Schema.Struct({ exp: Schema.Number });

/**
 * Validate JWT expiry by checking the exp claim.
 */
function validateExpiry(token: string, nowMillis: number) {
  return Jwt.decodeUnverified(token).pipe(
    Effect.flatMap(({ claims }) => Schema.decodeUnknownEffect(Expiry)(claims)),
    Effect.map(({ exp }) => exp > nowMillis / 1000),
    Effect.orElseSucceed(() => false),
  );
}

/**
 * Database contains no tokens at all.
 */
export class NoTokenFoundError extends Data.TaggedError(
  "NoTokenFoundError",
)<{}> {}

/**
 * Failed to refresh the token with the API.
 */
export class TokenRefreshError extends Data.TaggedError("TokenRefreshError")<{
  readonly cause: unknown;
}> {}

/**
 * Storing the refreshed token returned no rows.
 */
export class TokenStoreError extends Data.TaggedError("TokenStoreError")<{
  readonly cause: unknown;
}> {}
