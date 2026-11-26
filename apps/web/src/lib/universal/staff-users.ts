import type { Role } from "@apollo/auth";

/**
 * A user as staff surfaces name them: by the username of their linked COSMO
 * account, or by their Apollo username when they have no link. The two
 * namespaces can overlap, so the kind travels with the name. `avatar` is the
 * R2 key of their profile picture, null when they have none.
 */
export type StaffUser = {
  kind: "cosmo" | "apollo";
  username: string;
  avatar: string | null;
};

/**
 * A staff user's name where only text fits, such as a toast or a combobox
 * label; COSMO names carry an @.
 */
export function staffUserText(user: Pick<StaffUser, "kind" | "username">) {
  return user.kind === "cosmo" ? `@${user.username}` : user.username;
}

/**
 * The user who has linked a COSMO account, as the role tool reads them.
 */
export type RoleUser = {
  id: string;
  role: Role;
};
