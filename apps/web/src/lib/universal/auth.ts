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
 * Better Auth gives a Twitter account with no confirmed email a placeholder
 * under the reserved `.invalid` TLD (`<id>@twitter.placeholder.invalid`).
 * Sign-ins that would write one are refused, but older accounts still hold
 * the Twitter username it used to fall back to. Neither can receive mail.
 */
export function hasDeliverableEmail(email: string) {
  return (
    z.email().safeParse(email).success &&
    !email.toLowerCase().endsWith(".invalid")
  );
}

/**
 * The `error` Better Auth puts on the error callback URL when an OAuth sign-in
 * is refused for lacking an email.
 */
export const EMAIL_REQUIRED_ERROR = "email_required";
