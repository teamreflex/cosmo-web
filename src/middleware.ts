import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readToken } from "./lib/server/jwt";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const pathname = request.nextUrl.pathname;

  // verifies token validity
  const token = await readToken(request.cookies.get("token")?.value);

  if (!token) {
    // delete the token if it exists, as it must be invalid
    if (request.cookies.has("token")) {
      request.cookies.delete("token");
      response.cookies.delete("token");
    }

    // redirect to index when unauthenticated
    if (pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
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
