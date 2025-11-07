import { createServerOnlyFn } from "@tanstack/react-start";
import { refresh } from "@apollo/cosmo/server/auth";
import { validateExpiry } from "./jwt";
import { db } from "./db";
import { cosmoTokens } from "./db/schema";
import type { CosmoToken } from "./db/schema";

/**
 * Get the latest COSMO token from the database, refresh if necessary.
 */
export const getProxiedToken = createServerOnlyFn(
  async (): Promise<CosmoToken> => {
    const latestToken: CosmoToken | undefined =
      await db.query.cosmoTokens.findFirst({
        orderBy: {
          id: "desc",
        },
      });

    if (!latestToken) {
      throw new TokenNotFoundError();
    }

    try {
      // check if the token is expired
      if (validateExpiry(latestToken.accessToken) === false) {
        // validate the refresh token
        if (validateExpiry(latestToken.refreshToken)) {
          // if valid, refresh the token
          const newTokens = await refresh(latestToken.refreshToken);

          // create new token
          const [newToken] = await db
            .insert(cosmoTokens)
            .values({
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
            })
            .returning();

          if (!newToken) {
            throw new TokenCreateError();
          }

          // return new token
          return newToken;
        } else {
          throw new RefreshTokenInvalidError();
        }
      }
    } catch (err) {
      throw new TokenRefreshError();
    }

    return latestToken;
  },
);

/**
 * Base class for all token errors.
 */
class TokenError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Database contains no tokens at all.
 */
class TokenNotFoundError extends TokenError {
  constructor() {
    super("Token not found");
  }
}

/**
 * Database contains a valid access token, but the refresh token is invalid.
 */
class RefreshTokenInvalidError extends TokenError {
  constructor() {
    super("Refresh token is invalid");
  }
}

/**
 * Database contains a valid refresh token, but the refresh failed.
 */
class TokenRefreshError extends TokenError {
  constructor() {
    super("Error refreshing token");
  }
}

/**
 * Creating a new token failed.
 */
class TokenCreateError extends TokenError {
  constructor() {
    super("Error creating token");
  }
}
