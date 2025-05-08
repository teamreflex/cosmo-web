import "server-only";
import { decodeJwt } from "jose";

/**
 * Checks the JWT for a valid exp claim.
 */
export function validateExpiry(token: string): boolean {
  const claims = decodeJwt(token);
  return claims.exp !== undefined && claims.exp > Date.now() / 1000;
}

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
