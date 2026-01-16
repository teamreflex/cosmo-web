import type { RefreshTokenResult } from "../types/auth";
import { cosmo } from "./http";

/**
 * Refresh the given token.
 */
export async function refresh(
  refreshToken: string,
): Promise<RefreshTokenResult> {
  return await cosmo<{ credentials: RefreshTokenResult }>("/auth/v1/refresh", {
    method: "POST",
    body: { refreshToken },
  }).then((res: { credentials: RefreshTokenResult }) => res.credentials);
}
