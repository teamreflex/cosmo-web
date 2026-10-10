import { env } from "@/lib/env/server";
import { db } from "@/lib/server/db";
import type { AuthErrorCode } from "@/lib/universal/errors/auth";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { Role } from "@apollo/auth";
import { userChangeRefusal } from "@apollo/auth/guard";
import type { UserChange, UserChangeRefusal } from "@apollo/auth/guard";

export type NamedUser = {
  name: string;
  username: string | null;
  displayUsername: string | null;
};

/**
 * The user columns a relational query selects to build a NamedUser.
 */
export const namedUserColumns = {
  name: true,
  username: true,
  displayUsername: true,
} satisfies Record<keyof NamedUser, true>;

/**
 * The name staff see for an account: the username as the user typed it,
 * falling back to the account name for users who never set one.
 */
export function staffUsername(user: NamedUser) {
  return user.displayUsername ?? user.username ?? user.name;
}

/**
 * A user as a staff surface names them, such as a report's reporter or
 * resolver; null when the account was deleted.
 */
export function staffName(user: NamedUser | null) {
  return user === null ? null : { username: staffUsername(user) };
}

/**
 * Staff-facing names for a set of user ids; deleted users are missing from
 * the map.
 */
export async function fetchStaffUsernames(ids: string[]) {
  const users =
    ids.length === 0
      ? []
      : await db.query.user.findMany({
          where: { id: { in: ids } },
          columns: { id: true, ...namedUserColumns },
        });

  return new Map(users.map((user) => [user.id, staffUsername(user)]));
}

const userChangeErrors = {
  "protected-user": "protected_user",
  "self-ban": "self_ban",
  "self-demotion": "self_demotion",
} satisfies Record<UserChangeRefusal, AuthErrorCode>;

/**
 * Refuses a change the caller's role allows but `userChangeRefusal` doesn't,
 * and a missing target, before the admin plugin is called: its own refusals
 * aren't expected errors.
 */
export async function guardUserChange(
  caller: { id: string; role: Role },
  userId: string,
  change: UserChange,
) {
  const target = await db.query.user.findFirst({
    where: { id: userId },
    columns: { id: true, email: true, emailVerified: true },
  });
  if (!target) {
    throw new ExpectedError("user_not_found");
  }

  const refusal = userChangeRefusal({
    caller,
    target,
    change,
    protectedDomains: env.PROTECTED_EMAIL_DOMAINS,
  });
  if (refusal !== null) {
    throw new ExpectedError(userChangeErrors[refusal]);
  }
}
