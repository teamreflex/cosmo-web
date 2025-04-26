import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { baseUrl } from "../utils";
import type { auth } from "../server/auth";

/**
 * Better Auth client instance.
 */
export const authClient = createAuthClient({
  baseURL: baseUrl(),
  plugins: [inferAdditionalFields<typeof auth>()],
});
