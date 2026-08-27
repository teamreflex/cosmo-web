import { runCosmo } from "@apollo/cosmo/runtime";
import { refreshV3 } from "@apollo/cosmo/server/auth";
import { cosmoTokens } from "@apollo/database/web/schema";
import type { CosmoToken } from "@apollo/database/web/types";
import { decodeJwt } from "jose";
import { db } from "./db";
import { getCosmoKey } from "./encryption.server";

/**
 * Get the latest COSMO token from the database, refresh if necessary.
 */
export async function getProxiedToken(
  signal?: AbortSignal,
): Promise<CosmoToken> {
  const latestToken: CosmoToken | undefined =
    await db.query.cosmoTokens.findFirst({
      orderBy: {
        id: "desc",
      },
    });

  if (!latestToken) {
    throw new TokenNotFoundError();
  }

  // access token is still valid, use it as-is
  if (validateExpiry(latestToken.accessToken)) {
    return latestToken;
  }

  // operator-actionable: the dummy account needs a fresh login
  if (!validateExpiry(latestToken.refreshToken)) {
    throw new RefreshTokenInvalidError();
  }

  const key = await getCosmoKey();
  try {
    var newTokens = await runCosmo(
      refreshV3(latestToken.refreshToken, key),
      signal,
    );
  } catch (err) {
    throw new TokenRefreshError({ cause: err });
  }

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

  return newToken;
}

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
 * Base class for all token errors.
 */
export class TokenError extends Error {}

/**
 * Database contains no tokens at all.
 */
export class TokenNotFoundError extends TokenError {
  constructor() {
    super("Token not found");
  }
}

/**
 * Both the access and refresh tokens are expired; the dummy account needs to be logged in again.
 */
export class RefreshTokenInvalidError extends TokenError {
  constructor() {
    super("Refresh token is invalid");
  }
}

/**
 * Database contains a valid refresh token, but the refresh failed.
 */
export class TokenRefreshError extends TokenError {
  constructor(options?: ErrorOptions) {
    super("Error refreshing token", options);
  }
}

/**
 * Creating a new token failed.
 */
export class TokenCreateError extends TokenError {
  constructor() {
    super("Error creating token");
  }
}
