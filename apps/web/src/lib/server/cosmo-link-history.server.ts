import { db } from "@/lib/server/db";
import {
  namedUserColumns,
  staffUsername,
} from "@/lib/server/staff-users.server";
import { prefixPattern } from "@/lib/server/util.server";
import type { CosmoLinkHistoryEntry } from "@/lib/universal/cosmo-link-history";
import type { CosmoLinkHistoryQueryInput } from "@/lib/universal/schema/cosmo-link-history";
import { user } from "@apollo/database/auth";
import { cosmoAccounts, cosmoLinkAudit } from "@apollo/database/web/schema";
import { and, eq, exists, ilike, or } from "drizzle-orm";

const HISTORY_PAGE_SIZE = 50;

/**
 * Rows whose COSMO account's username or address, or whose user's username,
 * starts with the search. A deleted user has no username, so their rows are
 * found through the COSMO account.
 */
function matchesSearch(t: typeof cosmoLinkAudit, search: string) {
  const pattern = prefixPattern(search);
  return exists(
    db
      .select({ id: cosmoAccounts.id })
      .from(cosmoAccounts)
      .innerJoin(user, eq(user.id, t.userId))
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
 * One page of the link history, newest first, plus how many rows match the
 * search in total. Events written in one transaction share a timestamp, so
 * the id orders them.
 */
export async function fetchCosmoLinkHistory(input: CosmoLinkHistoryQueryInput) {
  const { search } = input;
  const [rows, total] = await Promise.all([
    db.query.cosmoLinkAudit.findMany({
      /**
       * drizzle rc.5 throws on explicit undefined filter values, so optional
       * filters are only present when set
       */
      where: {
        ...(input.cursor !== undefined && { id: { lt: input.cursor } }),
        ...(search !== undefined && { RAW: (t) => matchesSearch(t, search) }),
      },
      columns: { id: true, createdAt: true, event: true, reason: true },
      with: {
        cosmoAccount: { columns: { username: true, address: true } },
        user: { columns: { id: true, ...namedUserColumns } },
        staff: { columns: namedUserColumns },
      },
      orderBy: { id: "desc" },
      limit: HISTORY_PAGE_SIZE,
    }),
    db.$count(
      cosmoLinkAudit,
      search === undefined ? undefined : matchesSearch(cosmoLinkAudit, search),
    ),
  ]);

  const last = rows.at(-1);
  return {
    rows: rows.map((row): CosmoLinkHistoryEntry => ({
      id: row.id,
      createdAt: row.createdAt,
      event: row.event,
      cosmo: row.cosmoAccount,
      user: { id: row.user.id, username: staffUsername(row.user) },
      reason:
        row.reason === "staff-move"
          ? {
              kind: "staff-move",
              staff: row.staff === null ? null : staffUsername(row.staff),
            }
          : { kind: row.reason },
    })),
    nextCursor: rows.length === HISTORY_PAGE_SIZE && last ? last.id : undefined,
    total,
  };
}
