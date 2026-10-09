import { m } from "@/i18n/messages";
import { baseUrl } from "@/lib/utils";
import { ac, roles } from "@apollo/auth";
import {
  adminClient,
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../server/auth.server";

/**
 * Better Auth client instance.
 */
export const authClient = createAuthClient({
  baseURL: baseUrl(),
  plugins: [
    usernameClient(),
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
  ],
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
      case "BANNED_USER":
        return m.auth_error_banned();
      case "YOU_CANNOT_BAN_YOURSELF":
        return m.auth_error_ban_self();
      case "CANNOT_DEMOTE_SELF":
        return m.auth_error_demote_self();
      case "PROTECTED_USER":
        return m.auth_error_protected_user();
      case "YOU_ARE_NOT_ALLOWED_TO_BAN_USERS":
      case "YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE":
      case "YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS":
        return m.auth_error_forbidden();
      default:
        return error.message ?? m.auth_error_unknown();
    }
  }
  return error.message ?? m.auth_error_unknown();
}
