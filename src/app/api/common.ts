import { getCookie } from "@/lib/server/cookies";
import { refresh } from "@/lib/server/cosmo/auth";
import {
  COOKIE_NAME,
  generateCookiePayload,
  readToken,
  signToken,
  validateExpiry,
} from "@/lib/server/jwt";
import { TokenPayload } from "@/lib/universal/auth";
import { cookies } from "next/headers";

type AuthenticationResult =
  | {
      success: true;
      user: TokenPayload;
    }
  | {
      success: false;
      error: string;
      status: number;
    };

/**
 * Get the current user from the cookie.
 */
export async function getToken(): Promise<AuthenticationResult> {
  const token = getCookie("token");
  if (!token) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }
  const user = await readToken(token);
  if (!user) {
    return {
      success: false,
      status: 401,
      error: "unauthorized",
    };
  }

  return { success: true, user };
}

type TokenResult =
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      user: TokenPayload;
    }
  | {
      status: "refreshed";
      user: TokenPayload;
    };

/**
 * Ensure the Cosmo tokens are always valid when using them.
 */
export async function getAuth(): Promise<TokenResult> {
  const auth = await getToken();
  if (!auth.success) {
    return { status: "invalid" };
  }

  // validate the user's cosmo access token
  if (validateExpiry(auth.user.accessToken)) {
    return { status: "valid", user: auth.user };
  }

  // validate the user's cosmo refresh token
  if (validateExpiry(auth.user.refreshToken)) {
    // if valid, refresh the token
    const newTokens = await refresh(auth.user.refreshToken);
    const tokenPayload = {
      ...auth.user,
      ...newTokens,
    };

    // set the new cookie
    cookies().set(
      COOKIE_NAME,
      await signToken(tokenPayload),
      generateCookiePayload()
    );

    return {
      status: "refreshed",
      user: tokenPayload,
    };
  }

  // both tokens are invalid, fail the request
  return { status: "invalid" };
}

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders(ttl: number) {
  return {
    // vercel: cache for X seconds
    "Vercel-CDN-Cache-Control": `max-age=0, s-maxage=${ttl}, stale-while-revalidate=30`,
    // cloudflare: cache for 60 seconds
    "CDN-Cache-Control": `max-age=0, s-maxage=60`,
    // browser: cache for 30 seconds
    "Cache-Control": "max-age=30",
  };
}
