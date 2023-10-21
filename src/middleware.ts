import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUser } from "./app/api/common";
import {
  generateCookiePayload,
  signToken,
  validateExpiry,
} from "./lib/server/jwt";
import { refresh } from "./lib/server/cosmo";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // verifies token validity
  const auth = await getUser();

  if (auth.success === false) {
    // delete the token if it exists, as it must be invalid
    if (request.cookies.has("token")) {
      response.cookies.delete("token");
    }

    // redirect to index when unauthenticated
    if (request.nextUrl.pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  // validate the user's cosmo access token
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

  // pass the request on when in the app
  return response;
}

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
