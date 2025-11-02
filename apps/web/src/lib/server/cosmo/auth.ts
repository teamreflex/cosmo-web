import { createServerOnlyFn } from "@tanstack/react-start";
import { cosmo } from "../http";
import type { RefreshTokenResult } from "@/lib/universal/cosmo/auth";

/**
 * Refresh the given token.
 */
export const refresh = createServerOnlyFn(
  async (refreshToken: string): Promise<RefreshTokenResult> => {
    return await cosmo<{ credentials: RefreshTokenResult }>(
      "/auth/v1/refresh",
      {
        method: "POST",
        body: { refreshToken },
      },
    ).then((res) => res.credentials);
  },
);
