import { db } from "@/lib/server/db";

export type NamedUser = {
  name: string;
  username: string | null;
  displayUsername: string | null;
};

/**
 * The name staff see for an account: the username as the user typed it,
 * falling back to the account name for users who never set one.
 */
export function staffUsername(user: NamedUser) {
  return user.displayUsername ?? user.username ?? user.name;
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
          columns: {
            id: true,
            name: true,
            username: true,
            displayUsername: true,
          },
        });

  return new Map(users.map((user) => [user.id, staffUsername(user)]));
}
