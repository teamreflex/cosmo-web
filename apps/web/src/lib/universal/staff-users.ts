/**
 * A user as staff surfaces name them: by the username of their linked COSMO
 * account, or by their Apollo username when they have no link. The two
 * namespaces can overlap, so the kind travels with the name.
 */
export type StaffUser =
  | { kind: "cosmo"; username: string }
  | { kind: "apollo"; username: string };

/**
 * A staff user's name where only text fits, such as a toast or a combobox
 * label; COSMO names carry an @.
 */
export function staffUserText(user: StaffUser) {
  return user.kind === "cosmo" ? `@${user.username}` : user.username;
}
