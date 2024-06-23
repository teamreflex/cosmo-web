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
