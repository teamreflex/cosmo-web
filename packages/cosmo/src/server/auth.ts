import * as auth from "../effect/auth";
import type { RefreshTokenResult } from "../types/auth";
import { runCosmo } from "./runtime";

/**
 * Refresh the given token.
 * @deprecated use refreshV3
 */
export async function refresh(
  refreshToken: string,
  signal: AbortSignal | null = null,
): Promise<RefreshTokenResult> {
  return await runCosmo(auth.refresh(refreshToken), signal);
}

/**
 * Refresh the given token.
 */
export async function refreshV3(
  refreshToken: string,
  key: string,
  signal: AbortSignal | null = null,
): Promise<RefreshTokenResult> {
  return await runCosmo(auth.refreshV3(refreshToken, key), signal);
}
