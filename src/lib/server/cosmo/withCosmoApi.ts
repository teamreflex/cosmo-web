import { getUser } from "@/app/api/common";
import {
  COOKIE_NAME,
  generateCookiePayload,
  signToken,
  validateExpiry,
} from "../jwt";
import { refresh } from "./auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { TokenPayload } from "@/lib/universal/auth";

// route params should be a record of strings
type RouteParams<T extends Record<string, string> = {}> = T;

// route props contains params, searchParams etc
type RouteContext<TParams extends RouteParams> = {
  params: Promise<TParams>;
};

type RouteHandler<TParams extends RouteParams> = (props: {
  req: NextRequest;
  ctx: RouteContext<TParams>;
  user: TokenPayload;
}) => Promise<Response>;

/**
 * HOF for route handlers that handles COSMO access token refreshing.
 */
export function withCosmoApi<TParams extends RouteParams>(
  handler: RouteHandler<TParams>
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

          // set the new cookie
          store.set(
            COOKIE_NAME,
            await signToken({
              ...auth.user,
              ...newTokens,
            }),
            generateCookiePayload()
          );
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

    return await handler({
      req,
      ctx,
      user: auth.user,
    });
  };
}
