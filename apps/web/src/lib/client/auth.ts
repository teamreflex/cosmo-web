import { m } from "@/i18n/messages";
import { baseUrl } from "@/lib/utils";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../server/auth";

/**
 * Better Auth client instance.
 */
export const authClient = createAuthClient({
  baseURL: baseUrl(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});

type ErrorInput = {
  code?: string | undefined;
  message?: string | undefined;
};

/**
 * Provides error messages for Better Auth errors.
 */
export function getAuthErrorMessage(error: ErrorInput) {
  if (error.code) {
    switch (error.code) {
      case "USERNAME_IS_ALREADY_TAKEN":
        return m.auth_error_username_taken();
      case "USER_ALREADY_EXISTS":
        return m.auth_error_email_exists();
      default:
        return error.message ?? m.auth_error_unknown();
    }
  }
  return error.message ?? m.auth_error_unknown();
}
