import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readToken } from "./lib/server/jwt";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const pathname = request.nextUrl.pathname;

  // verifies token validity
  const token = await readToken(request);

  if (!token) {
    if (request.cookies.has("token")) {
      request.cookies.delete("token");
      response.cookies.delete("token");
    }

    // redirects from the app to /login when not authenticated
    if (pathname !== "/" && !pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  // redirect to the app from index or /login when authenticated
  if (pathname === "/" || pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/home", request.url));
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
