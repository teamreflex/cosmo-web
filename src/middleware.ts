import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "./app/api/common";
import {
  COOKIE_NAME,
  generateCookiePayload,
  signToken,
} from "./lib/server/jwt";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};

/**
 * allow unauthenticated access to these paths:
 * - /@:username
 * - /profile/:username
 * - /objekts
 * - /auth
 *
 * this is separate to the matcher as these paths still need token handling
 */
const allowUnauthenticated = new RegExp(
  "^(/@.*|/profile/[^/]*|/objekts|/auth)$"
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // verifies token validity
  const auth = await getAuth();

  switch (auth.status) {
    // token is valid, pass the request on
    case "valid": {
      return NextResponse.next();
    }
    // token is invalid, delete the cookie and redirect to the homepage
    case "invalid": {
      const response = NextResponse.next();

      // delete the token if it exists, as it must be invalid
      if (request.cookies.has(COOKIE_NAME)) {
        response.cookies.delete(COOKIE_NAME);
      }

      // redirect to objekt index when unauthenticated
      if (allowUnauthenticated.test(path) === false) {
        return NextResponse.redirect(new URL("/objekts", request.url));
      }

      return response;
    }
    // token has been refreshed, set the new cookie and pass the request on
    case "refreshed": {
      /**
       * workaround for: https://github.com/vercel/next.js/issues/49442
       * cookies.set() applies the Set-Cookie header to the response.
       * RSCs don't take this into account when reading the cookie,
       * so just using .next() results in the RSC receiving the old cookie until a page refresh occurs.
       */
      const response = NextResponse.redirect(request.url);

      // set the new cookie
      response.cookies.set(
        COOKIE_NAME,
        await signToken(auth.user),
        generateCookiePayload()
      );

      return response;
    }
  }
}
