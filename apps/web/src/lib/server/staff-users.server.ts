import { env } from "@/lib/env/server";
import { db, type WebTx } from "@/lib/server/db";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import { closeOpenOffers, tradeParty } from "@/lib/server/trades.server";
import {
  disputeTrade,
  lockParties,
  lockTrade,
} from "@/lib/server/trades/trade.server";
import type { AuthErrorCode } from "@/lib/universal/errors/auth";
import { ExpectedError } from "@/lib/universal/errors/expected";
import type { BanUserInput } from "@/lib/universal/schema/staff-users";
import type { StaffUser } from "@/lib/universal/staff-users";
import type { Role } from "@apollo/auth";
import { userChangeRefusal } from "@apollo/auth/guard";
import type { UserChange, UserChangeRefusal } from "@apollo/auth/guard";
import { tradeOffers, user } from "@apollo/database/web/schema";
import { transition } from "@apollo/trades/lifecycle";
import { and, asc, eq } from "drizzle-orm";

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
 * The relational `columns` and `with` that load a StaffUserRow, joining the
 * user's COSMO account.
 */
export const staffUserFields = {
  columns: namedUserColumns,
  with: { cosmoAccount: { columns: { username: true } } },
} as const;

export type StaffUserRow = NamedUser & {
  cosmoAccount: { username: string } | null;
};

/**
 * The account's Apollo username as the user typed it, falling back to the
 * account name for users who never set one. Staff see it where the user's
 * current COSMO account may not be the one a row describes, such as the link
 * history.
 */
export function apolloUsername(user: NamedUser) {
  return user.displayUsername ?? user.username ?? user.name;
}

/**
 * A user as staff surfaces name them; null when the account was deleted.
 */
export function staffUser(user: StaffUserRow): StaffUser;
export function staffUser(user: StaffUserRow | null): StaffUser | null;
export function staffUser(user: StaffUserRow | null): StaffUser | null {
  if (user === null) {
    return null;
  }
  return user.cosmoAccount === null
    ? { kind: "apollo", username: apolloUsername(user) }
    : { kind: "cosmo", username: user.cosmoAccount.username };
}

/**
 * Staff user rows for a set of user ids; deleted users are missing from the
 * map.
 */
export async function fetchStaffUsers(ids: string[]) {
  const users =
    ids.length === 0
      ? []
      : await db.query.user.findMany({
          where: { id: { in: ids } },
          columns: { id: true, ...staffUserFields.columns },
          with: staffUserFields.with,
        });

  return new Map(users.map((user) => [user.id, user]));
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

/**
 * Bans a user and, in the same transaction, puts their accepted trades on
 * hold under a dispute the ban files for each, removes their open listings
 * and closes their pending offers, so a banned user never has a live trade
 * that isn't with staff. The user and every counterparty are locked first,
 * in id order. Returns when the ban ends and the disputed trades' ids.
 */
export async function banAndSweep(
  tx: WebTx,
  staffId: string,
  { userId, reason, expiresIn }: BanUserInput,
) {
  const trades = await tx
    .select({
      id: tradeOffers.id,
      fromUserId: tradeOffers.fromUserId,
      toUserId: tradeOffers.toUserId,
    })
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.kind, "trade"),
        eq(tradeOffers.status, "accepted"),
        tradeParty(userId),
      ),
    )
    .orderBy(asc(tradeOffers.id));
  const users = await lockParties(
    tx,
    [userId, ...trades.flatMap((trade) => [trade.fromUserId, trade.toUserId])],
    "no key update",
  );

  const banExpires =
    expiresIn === null ? null : new Date(Date.now() + expiresIn * 1000);
  await tx
    .update(user)
    .set({ banned: true, banReason: reason, banExpires, updatedAt: new Date() })
    .where(eq(user.id, userId));

  const disputedIds: string[] = [];
  for (const { id } of trades) {
    const trade = await lockTrade(tx, id);
    if (!transition(trade.state, { type: "dispute", by: "staff" }).ok) {
      continue;
    }

    const reportId = await disputeTrade(
      tx,
      trade,
      users.filter(
        (row) =>
          row.id !== userId &&
          (row.id === trade.fromUserId || row.id === trade.toUserId),
      ),
      {
        by: "staff",
        reporterId: staffId,
        reason: "party_banned",
        note: reason,
      },
    );
    await recordStaffAudit(tx, {
      staffId,
      action: "trade:dispute",
      tradeId: trade.id,
      reportId,
    });
    disputedIds.push(trade.id);
  }

  await closeOpenOffers(tx, userId, "removed");
  return { banExpires, disputedIds };
}
