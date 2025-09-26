import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import type { auth } from "../server/auth";
import { baseUrl } from "@/lib/utils";

/**
 * Better Auth client instance.
 */
export const authClient = createAuthClient({
  baseURL: baseUrl(),
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});

const authErrorMessages: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: "Username is already taken.",
  USER_ALREADY_EXISTS: "Email is already in use.",
};

type ErrorInput = {
  code?: string | undefined;
  message?: string | undefined;
};

/**
 * Provides error messages for Better Auth errors.
 */
export function getAuthErrorMessage(error: ErrorInput) {
  if (error.code) {
    return (
      authErrorMessages[error.code] ??
      error.message ??
      "An unknown error occurred."
    );
  }
  return error.message ?? "An unknown error occurred.";
}
