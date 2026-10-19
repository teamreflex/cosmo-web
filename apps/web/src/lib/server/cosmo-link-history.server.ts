import { db } from "@/lib/server/db";
import {
  apolloUsername,
  namedUserColumns,
  staffUser,
  staffUserFields,
} from "@/lib/server/staff-users.server";
import { prefixPattern } from "@/lib/server/util.server";
import type { CosmoLinkHistoryEntry } from "@/lib/universal/cosmo-link-history";
import type { CosmoLinkHistoryQueryInput } from "@/lib/universal/schema/cosmo-link-history";
import { user } from "@apollo/database/auth";
import { cosmoAccounts, cosmoLinkAudit } from "@apollo/database/web/schema";
import { and, EmptyFilter, eq, exists, ilike, or } from "drizzle-orm";

const HISTORY_PAGE_SIZE = 50;

/**
 * Rows whose COSMO account's username or address, or whose user's username,
 * starts with the search. A deleted user's row is gone, so their rows are
 * found through the COSMO account.
 */
function matchesSearch(t: typeof cosmoLinkAudit, search: string) {
  const pattern = prefixPattern(search);
  return exists(
    db
      .select({ id: cosmoAccounts.id })
      .from(cosmoAccounts)
      .leftJoin(user, eq(user.id, t.userId))
      .where(
        and(
          eq(cosmoAccounts.id, t.cosmoAccountId),
          or(
            ilike(cosmoAccounts.username, pattern),
            ilike(cosmoAccounts.address, pattern),
            ilike(user.username, pattern),
            ilike(user.displayUsername, pattern),
          ),
        ),
      ),
  );
}

/**
 * One page of the link history, newest first. The first page also carries how
 * many rows match the search in total, the only page the client reads it
 * from. Events written in one transaction share a timestamp, so the id orders
 * them.
 */
export async function fetchCosmoLinkHistory(input: CosmoLinkHistoryQueryInput) {
  const { search } = input;
  const rows = await db.query.cosmoLinkAudit.findMany({
    where: {
      id: { lt: input.cursor ?? EmptyFilter },
      RAW: search === undefined ? EmptyFilter : (t) => matchesSearch(t, search),
    },
    columns: {
      id: true,
      createdAt: true,
      userId: true,
      event: true,
      reason: true,
    },
    with: {
      cosmoAccount: { columns: { username: true, address: true } },
      user: { columns: namedUserColumns },
      staff: staffUserFields,
    },
    orderBy: { id: "desc" },
    limit: HISTORY_PAGE_SIZE,
  });
  const total =
    input.cursor === undefined
      ? await db.$count(
          cosmoLinkAudit,
          search === undefined
            ? undefined
            : matchesSearch(cosmoLinkAudit, search),
        )
      : undefined;

  const last = rows.at(-1);
  return {
    rows: rows.map((row): CosmoLinkHistoryEntry => ({
      id: row.id,
      createdAt: row.createdAt,
      event: row.event,
      cosmo: row.cosmoAccount,
      user: {
        id: row.userId,
        username: row.user === null ? null : apolloUsername(row.user),
      },
      reason:
        row.reason === "staff-move"
          ? {
              kind: "staff-move",
              staff: staffUser(row.staff),
            }
          : { kind: row.reason },
    })),
    nextCursor: rows.length === HISTORY_PAGE_SIZE && last ? last.id : undefined,
    total,
  };
}
