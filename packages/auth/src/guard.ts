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
 * Whether the ban still applies. The admin plugin lifts a lapsed ban only at
 * the user's next sign-in, so `banned` can stay true after it expires.
 */
export function isBanActive(
  user: { banned: boolean; banExpires: Date | null },
  now: Date = new Date(),
) {
  return user.banned && (user.banExpires === null || user.banExpires > now);
}

/**
 * A staff change to an account's access or role.
 */
export type UserChange =
  | { kind: "ban" }
  | { kind: "unban" }
  | { kind: "set-role"; role: Role };

export type UserChangeRefusal =
  | "deleted-user"
  | "protected-user"
  | "self-ban"
  | "self-demotion";

type UserChangeCheck = {
  caller: { id: string; role: Role };
  target: {
    id: string;
    email: string;
    emailVerified: boolean;
    deletedAt: Date | null;
  };
  change: UserChange;
  protectedDomains: ReadonlySet<string>;
};

/**
 * Why a staff member who holds the permission still may not make the change,
 * or null when they may. A deleted account can't be changed at all. Nobody,
 * admins included, can change a protected account, and nobody can ban
 * themselves or lower their own role.
 */
export function userChangeRefusal({
  caller,
  target,
  change,
  protectedDomains,
}: UserChangeCheck): UserChangeRefusal | null {
  if (target.deletedAt !== null) {
    return "deleted-user";
  }

  if (isProtectedAccount(target, protectedDomains)) {
    return "protected-user";
  }

  if (change.kind === "ban" && target.id === caller.id) {
    return "self-ban";
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

export type CosmoTransferRefusal = "protected-user" | "deleted" | "banned";

type TransferUser = {
  banned: boolean;
  banExpires: Date | null;
  deletedAt: Date | null;
};

type CosmoTransferCheck = {
  from: TransferUser & { email: string; emailVerified: boolean };
  to: TransferUser;
  protectedDomains: ReadonlySet<string>;
  now: Date;
};

/**
 * Why staff may not move a COSMO link from one user to another, or null when
 * they may. Only the source is protected, because receiving a link takes
 * nothing from an account. A deleted or actively banned user can neither give
 * nor receive one.
 */
export function cosmoTransferRefusal({
  from,
  to,
  protectedDomains,
  now,
}: CosmoTransferCheck): CosmoTransferRefusal | null {
  if (isProtectedAccount(from, protectedDomains)) {
    return "protected-user";
  }

  if (from.deletedAt !== null || to.deletedAt !== null) {
    return "deleted";
  }

  if (isBanActive(from, now) || isBanActive(to, now)) {
    return "banned";
  }

  return null;
}

export type CosmoLinkRefusal = "linked-elsewhere" | "deleted" | "banned";

/**
 * The user a COSMO address is linked to.
 */
export type CosmoLinkOwner = TransferUser & { id: string };

type CosmoLinkCheck = {
  callerId: string;
  owner: CosmoLinkOwner | null;
  now: Date;
};

/**
 * Why the caller may not link a COSMO address, or null when nobody holds it
 * or the caller already does. A deleted owner keeps the address for good.
 * Callers decide whether to reveal a ban, since it says something about the
 * owner.
 */
export function cosmoLinkRefusal({
  callerId,
  owner,
  now,
}: CosmoLinkCheck): CosmoLinkRefusal | null {
  if (owner === null || owner.id === callerId) {
    return null;
  }

  if (owner.deletedAt !== null) {
    return "deleted";
  }

  return isBanActive(owner, now) ? "banned" : "linked-elsewhere";
}
