import { can } from "./index";
import type { Role } from "./index";

/**
 * Each role holds every permission of the roles ranked below it, so a lower
 * rank always means fewer permissions.
 */
const roleRanks = {
  user: 0,
  moderator: 1,
  admin: 2,
} as const satisfies Record<Role, number>;

/**
 * Whether moving from one role to the other takes permissions away.
 */
export function isDemotion(from: Role, to: Role) {
  return roleRanks[to] < roleRanks[from];
}

/**
 * A comma-separated list of email domains, trimmed and lowercased. Empty
 * entries are dropped, so an empty or unset value protects nobody.
 */
export function parseEmailDomains(
  value: string | undefined,
): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter((domain) => domain !== ""),
  );
}

/**
 * Whether the email's domain is one of `domains`. Matching is exact: a
 * subdomain or a lookalike only matches when it is listed itself.
 */
export function hasEmailDomain(email: string, domains: ReadonlySet<string>) {
  return domains.has(email.slice(email.lastIndexOf("@") + 1).toLowerCase());
}

/**
 * Whether nobody may ban, unban or re-role the account. Only a verified email
 * counts: sign-up doesn't require verification, so anyone could otherwise
 * register on a protected domain and become unbannable.
 */
export function isProtectedAccount(
  account: { email: string; emailVerified: boolean },
  domains: ReadonlySet<string>,
) {
  return account.emailVerified && hasEmailDomain(account.email, domains);
}

/**
 * Whether the account is protected, as `viewer` may learn it: only roles that
 * can ban are told, so nobody else can map out which accounts are protected.
 * Null for everyone else.
 */
export function protectionFor(
  viewer: Role,
  account: { email: string; emailVerified: boolean },
  domains: ReadonlySet<string>,
) {
  return can(viewer, { user: ["ban"] })
    ? isProtectedAccount(account, domains)
    : null;
}

/**
 * A staff change to an account's access or role, as the admin plugin's
 * ban, unban and set-role endpoints make it.
 */
export type UserChange =
  | { kind: "ban" }
  | { kind: "unban" }
  | { kind: "set-role"; role: Role };

export type UserChangeRefusal = "protected-user" | "self-demotion";

type UserChangeCheck = {
  caller: { id: string; role: Role };
  target: { id: string; email: string; emailVerified: boolean };
  change: UserChange;
  protectedDomains: ReadonlySet<string>;
};

/**
 * Why a staff member who holds the permission still may not make the change,
 * or null when they may. Nobody, admins included, can change a protected
 * account, and nobody can lower their own role.
 */
export function userChangeRefusal({
  caller,
  target,
  change,
  protectedDomains,
}: UserChangeCheck): UserChangeRefusal | null {
  if (isProtectedAccount(target, protectedDomains)) {
    return "protected-user";
  }

  if (
    change.kind === "set-role" &&
    target.id === caller.id &&
    isDemotion(caller.role, change.role)
  ) {
    return "self-demotion";
  }

  return null;
}
