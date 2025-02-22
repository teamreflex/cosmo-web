import { validateExpiry } from "../jwt";
import { refresh } from "../cosmo/auth";
import { NextRequest } from "next/server";
import { RouteContext, RouteHandler, RouteParams } from "./common";
import { db } from "../db";
import { CosmoToken, cosmoTokens } from "../db/schema";

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
    const latestToken = await db.query.cosmoTokens.findFirst({
      orderBy: (tokens, { desc }) => desc(tokens.id),
    });

    if (!latestToken) {
      return new Response("unauthorized: token not found", { status: 401 });
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

          // execute handler with new token
          return await handler({
            req,
            ctx,
            token: newToken,
          });
        } else {
          console.error("[withProxiedToken] Refresh token is invalid");
          return new Response("unauthorized: refresh token is invalid", {
            status: 401,
          });
        }
      }
    } catch (err) {
      console.error("[withProxiedToken] Error refreshing token", err);
      return new Response("unauthorized: error refreshing token", {
        status: 401,
      });
    }

    // token is valid, execute handler
    return await handler({
      req,
      ctx,
      token: latestToken,
    });
  };
}
