import { createAccessControl } from "better-auth/plugins/access";
import type { AdminOptions } from "better-auth/plugins/admin";

/**
 * Every permission a staff role can hold. `as const` keeps each action list a
 * literal tuple, so a misspelt action or resource fails to compile. Impersonation
 * and session management are absent, so no role can be granted them.
 */
export const statement = {
  trade: ["read-any", "cancel-any", "resolve-dispute"],
  chat: ["read-any", "remove-message"],
  listing: ["remove-any"],
  feedback: ["remove-any"],
  report: ["read", "resolve", "escalate"],
  user: ["ban", "set-role"],
  site: ["manage"],
  audit: ["read"],
  cosmo: ["transfer", "history"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  user: ac.newRole({}),
  moderator: ac.newRole({
    trade: statement.trade,
    chat: statement.chat,
    listing: statement.listing,
    feedback: statement.feedback,
    report: statement.report,
  }),
  admin: ac.newRole(statement),
};

type Statement = typeof statement;

/**
 * A permission check, assignable both to `Role.authorize` and to the admin
 * plugin's `userHasPermission` body (which rejects the readonly-array and
 * connector forms of Better Auth's `RoleAuthorizeRequest`).
 */
export type Permissions = { [R in keyof Statement]?: Statement[R][number][] };

export type Role = keyof typeof roles;

export const roleNames = [
  "user",
  "moderator",
  "admin",
] as const satisfies readonly Role[];

/**
 * Narrows a role string from Better Auth. Missing, unknown and comma-joined
 * multi-role values fall back to "user".
 */
export function parseRole(value: string | null | undefined): Role {
  return roleNames.find((role) => role === value) ?? "user";
}

/**
 * Whether the role holds every requested action, using the same check as the
 * admin plugin's endpoints.
 */
export function can(role: Role, permissions: Permissions) {
  return roles[role].authorize(permissions).success;
}

/**
 * Shared by the server's admin plugin and the role tests. `adminUserIds` must
 * stay unset: it bypasses every permission check.
 */
export const adminPluginOptions = {
  ac,
  roles,
  defaultRole: "user",
  adminRoles: ["admin"],
} satisfies AdminOptions;
