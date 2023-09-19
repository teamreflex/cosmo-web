import { SignJWT, jwtVerify } from "jose";
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
  cosmoToken: string;
};

/**
 * Generate a token with the given payload.
 * @param payload TokenPayload
 * @returns Promise<string>
 */
export async function signToken(payload: TokenPayload) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new SignJWT({ data: payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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
 * @param token string
 * @returns Promise<TokenResult>
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
