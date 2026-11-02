import type { CollectionDataSource } from "@apollo/util";
import * as z from "zod";

export type PublicUser = {
  id: string;
  username: string | undefined;
  image: string | undefined;
  gridColumns: number;
  collectionMode: CollectionDataSource;
  social: {
    discord: string | undefined;
    twitter: string | undefined;
  };
  showSocials: boolean;
} & { __brand: "PublicUser" };

/**
 * The signed-in user's own account. It carries settings that other users'
 * payloads leave out, since the display currency hints at a user's country.
 */
export type CurrentUser = PublicUser & {
  currency: string;
};

/**
 * Twitter falls back to the username when an account has no confirmed email.
 * Sign-ins that would write one are refused, but older accounts still hold a
 * username, which can't receive mail.
 */
export function hasDeliverableEmail(email: string) {
  return z.email().safeParse(email).success;
}

/**
 * The `error` Better Auth puts on the error callback URL when an OAuth sign-in
 * is refused for lacking an email.
 */
export const EMAIL_REQUIRED_ERROR = "email_required";
