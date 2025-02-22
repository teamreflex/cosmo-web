import { getUser } from "@/app/api/common";
import {
  COOKIE_NAME,
  generateCookiePayload,
  signToken,
  validateExpiry,
} from "../jwt";
import { refresh } from "../cosmo/auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { TokenPayload } from "@/lib/universal/auth";
import { RouteContext, RouteHandler, RouteParams } from "./common";

type Payload = {
  user: TokenPayload;
};

/**
 * HOF for route handlers that handles COSMO access token refreshing.
 */
export function withCosmoApi<TParams extends RouteParams>(
  handler: RouteHandler<TParams, Payload>
) {
  return async function (req: NextRequest, ctx: RouteContext<TParams>) {
    const store = await cookies();
    const auth = await getUser();

    // user is not authenticated
    if (auth.success === false) {
      return new Response(auth.error, { status: auth.status });
    }

    // validate the user's cosmo access token
    try {
      if (validateExpiry(auth.user.accessToken) === false) {
        // validate the user's cosmo refresh token
        if (validateExpiry(auth.user.refreshToken)) {
          // if valid, refresh the token
          const newTokens = await refresh(auth.user.refreshToken);

          // build new payload
          const newPayload = {
            ...auth.user,
            ...newTokens,
          };

          // set the new cookie
          store.set(
            COOKIE_NAME,
            await signToken(newPayload),
            generateCookiePayload()
          );

          // execute handler with new payload
          return await handler({
            req,
            ctx,
            user: newPayload,
          });
        } else {
          // if invalid, delete the cookie since we can't refresh it
          store.delete(COOKIE_NAME);
          return new Response("unauthorized", { status: 401 });
        }
      }
    } catch (err) {
      // something has failed (probably jwt payload change), nuke everything
      store.delete(COOKIE_NAME);
      return new Response("unauthorized", { status: 401 });
    }

    // token is valid, execute handler
    return await handler({
      req,
      ctx,
      user: auth.user,
    });
  };
}
