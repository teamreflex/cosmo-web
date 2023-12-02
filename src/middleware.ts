import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUser } from "./app/api/common";
import {
  generateCookiePayload,
  signToken,
  validateExpiry,
} from "./lib/server/jwt";
import { refresh } from "./lib/server/cosmo/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

/**
 * allow unauthenticated access to these paths:
 * - /
 * - /@:username
 * - /u/:username
 * - /objekts
 * - /api/objekts
 * - /api/objekt/v1/owned-by/[nickname]
 * - /api/user/v1/search
 *
 * this is separate to the matcher as these paths still need token handling
 */
const allowUnauthenticated = new RegExp(
  "^(/@.*|/u/[^/]*|/objekts|/api/objekts|/api/objekt/v1/owned-by/.*|/api/user/v1/search)$"
);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;

  // verifies token validity
  const auth = await getUser();

  if (auth.success === false) {
    // delete the token if it exists, as it must be invalid
    if (request.cookies.has("token")) {
      response.cookies.delete("token");
    }

    // redirect to objekt index when unauthenticated
    if (allowUnauthenticated.test(path) === false) {
      return NextResponse.redirect(new URL("/objekts", request.url));
    }

    return response;
  }

  // validate the user's cosmo access token
  try {
    if (validateExpiry(auth.user.accessToken) === false) {
      // validate the user's cosmo refresh token
      if (validateExpiry(auth.user.refreshToken)) {
        // if valid, refresh the token
        const newTokens = await refresh(auth.user.refreshToken);

        // set the new cookie
        response.cookies.set(
          "token",
          await signToken({
            ...auth.user,
            ...newTokens,
          }),
          generateCookiePayload()
        );
      } else {
        // if invalid, delete the cookie since we can't refresh it
        const redirect = NextResponse.redirect(new URL("/", request.url));
        redirect.cookies.delete("token");
        return redirect;
      }
    }
  } catch (err) {
    // something has failed (probably jwt payload change), nuke everything
    const redirect = NextResponse.redirect(new URL("/", request.url));
    redirect.cookies.delete("token");
    return redirect;
  }

  // pass the request on when in the app
  return response;
}
