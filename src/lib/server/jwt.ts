import "server-only";

/**
 * Generate the payload for a cookie.
 */
export function generateCookiePayload() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: true,
    httpOnly: true,
    secure: true,
  };
}
