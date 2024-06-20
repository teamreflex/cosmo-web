import { getCookie } from "@/lib/server/cookies";
import { readToken } from "@/lib/server/jwt";
import { TokenPayload } from "@/lib/universal/auth";

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

export async function getUser(): Promise<AuthenticationResult> {
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

/**
 * Default cache headers for API responses.
 */
export function cacheHeaders(ttl: number) {
  return {
    // browser: cache for 10 seconds
    "Cache-Control": `max-age=10`,
    // cloudflare: cache for 60 seconds
    "CDN-Cache-Control": "max-age=60",
    // vercel: cache for X seconds
    "Vercel-CDN-Cache-Control": `max-age=${ttl}, stale-while-revalidate=30`,
  };
}
