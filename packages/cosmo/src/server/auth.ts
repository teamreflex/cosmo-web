import type { RefreshTokenResult } from "../types/auth";
import { encrypt, EncryptionError } from "./encryption";
import { cosmo } from "./http";

/**
 * Refresh the given token.
 * @deprecated use refreshV3
 */
export async function refresh(
  refreshToken: string,
  signal: AbortSignal | null = null,
): Promise<RefreshTokenResult> {
  return await cosmo<{ credentials: RefreshTokenResult }>("/auth/v1/refresh", {
    method: "POST",
    body: { refreshToken },
    signal,
  }).then((res: { credentials: RefreshTokenResult }) => res.credentials);
}

/**
 * Refresh the given token.
 */
export async function refreshV3(
  refreshToken: string,
  key: string,
  signal: AbortSignal | null = null,
): Promise<RefreshTokenResult> {
  try {
    var body = encrypt(JSON.stringify({ refreshToken }), key);
  } catch (err) {
    throw new EncryptionError("Error encrypting payload", { cause: err });
  }

  return await cosmo<{ credentials: RefreshTokenResult }>(
    "/bff/v3/users/refresh-access-token",
    {
      method: "POST",
      body,
      headers: {
        "Content-Type": "text/plain",
        "x-cosmo-encrypted": "1",
      },
      signal,
    },
  ).then((res: { credentials: RefreshTokenResult }) => res.credentials);
}
