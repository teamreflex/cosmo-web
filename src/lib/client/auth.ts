import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { baseUrl } from "../query-client";
import type { auth } from "../server/auth";

/**
 * Better Auth client instance.
 */
export const authClient = createAuthClient({
  baseURL: baseUrl(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});
