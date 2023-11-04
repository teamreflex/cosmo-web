import "server-only";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { env } from "@/env.mjs";

export async function readToken(token?: string) {
  if (token) {
    const decoded = await decodeToken(token);
    if (decoded.success) {
      return decoded.payload;
    }
  }
}

export type TokenPayload = {
  id: number;
  email: string;
  nickname: string;
  address: string;
  accessToken: string;
  refreshToken: string;
};

/**
 * Generate a token with the given payload.
 */
export async function signToken(payload: TokenPayload) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new SignJWT({ data: payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

type TokenResult =
  | {
      success: true;
      payload: TokenPayload;
    }
  | { success: false };

/**
 * Decode the given token.
 */
export async function decodeToken(token: string): Promise<TokenResult> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload !== "object" || !("data" in payload)) {
      throw new Error("invalid token");
    }

    return {
      success: true,
      payload: payload.data as TokenPayload,
    };
  } catch (err) {
    return { success: false };
  }
}

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
    secure: env.VERCEL_ENV !== "development",
  };
}
