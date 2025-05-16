import { validateExpiry } from "../jwt";
import { refresh } from "../cosmo/auth";
import { NextRequest } from "next/server";
import { RouteContext, RouteHandler, RouteParams } from "./common";
import { db } from "../db";
import { CosmoToken, cosmoTokens } from "../db/schema";
import { captureException } from "@sentry/nextjs";

type Payload = {
  token: CosmoToken;
};

/**
 * HOF for route handlers that utilize a proxied COSMO access token.
 */
export function withProxiedToken<TParams extends RouteParams>(
  handler: RouteHandler<TParams, Payload>
) {
  return async function (req: NextRequest, ctx: RouteContext<TParams>) {
    try {
      return await handler({
        req,
        ctx,
        token: await getProxiedToken(),
      });
    } catch (err) {
      if (err instanceof TokenError) {
        captureException(err);
        console.error(`[withProxiedToken] ${err.message}`);
        return new Response(`unauthorized: ${err.message}`, { status: 401 });
      }

      captureException(err);
      console.error(`[withProxiedToken] Error getting proxied token`, err);
      return new Response(`unauthorized: unknown error`, { status: 401 });
    }
  };
}

/**
 * Get the latest COSMO token from the database, refresh if necessary.
 */
export async function getProxiedToken() {
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
}

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
