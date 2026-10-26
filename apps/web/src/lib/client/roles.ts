import { m } from "@/i18n/messages";
import type { Role } from "@apollo/auth";

const roleLabels = {
  user: m.role_user,
  tester: m.role_tester,
  moderator: m.role_moderator,
  admin: m.role_admin,
} satisfies Record<Role, () => string>;

/**
 * Maps a staff role to its localized name.
 */
export function roleLabel(role: Role): string {
  return roleLabels[role]();
}
