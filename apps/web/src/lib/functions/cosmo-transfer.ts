import { transferCosmoAccount } from "@/lib/server/cosmo-transfer.server";
import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import {
  namedUserColumns,
  staffUsername,
} from "@/lib/server/staff-users.server";
import {
  COSMO_TRANSFER_PERMISSIONS,
  type CosmoTransferSource,
  type CosmoTransferTarget,
} from "@/lib/universal/cosmo-transfer";
import {
  cosmoTransferSearchSchema,
  transferCosmoAccountSchema,
} from "@/lib/universal/schema/cosmo-transfer";
import { cosmoAccounts } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, notExists } from "drizzle-orm";

/**
 * A prefix match with LIKE wildcards escaped, so they match literally.
 */
function prefixPattern(query: string) {
  return `${query.replace(/[\\%_]/g, "\\$&")}%`;
}

/**
 * Move a COSMO account's link to another user.
 */
export const $transferCosmoAccount = createServerFn({ method: "POST" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(transferCosmoAccountSchema)
  .handler(({ data, context }) =>
    transferCosmoAccount(context.session.user.id, data),
  );

/**
 * Linked COSMO accounts by username, for the Move dialog's From. Deleted
 * owners stay listed, without a name, so staff can see why a move is refused.
 */
export const $searchCosmoTransferSources = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(cosmoTransferSearchSchema)
  .handler(async ({ data }) => {
    const rows = await db.query.cosmoAccounts.findMany({
      where: {
        username: { ilike: prefixPattern(data.query) },
        userId: { isNotNull: true },
      },
      columns: { address: true, username: true },
      with: { user: { columns: { id: true, ...namedUserColumns } } },
      limit: 10,
    });

    // a link can name a user id that no longer exists, which can't be moved
    return rows.flatMap((row): CosmoTransferSource[] =>
      row.user === null
        ? []
        : [
            {
              address: row.address,
              cosmoUsername: row.username,
              owner: { id: row.user.id, username: staffUsername(row.user) },
            },
          ],
    );
  });

/**
 * Live users without a COSMO link, by username or name, for the Move
 * dialog's To.
 */
export const $searchCosmoTransferTargets = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(cosmoTransferSearchSchema)
  .handler(async ({ data }) => {
    const pattern = prefixPattern(data.query);
    const users = await db.query.user.findMany({
      where: {
        OR: [
          { username: { ilike: pattern } },
          { displayUsername: { ilike: pattern } },
          { name: { ilike: pattern } },
        ],
        deletedAt: { isNull: true },
        RAW: (t) =>
          notExists(
            db
              .select({ id: cosmoAccounts.id })
              .from(cosmoAccounts)
              .where(eq(cosmoAccounts.userId, t.id)),
          ),
      },
      columns: { id: true, ...namedUserColumns },
      limit: 10,
    });

    return users.flatMap((user): CosmoTransferTarget[] => {
      const username = staffUsername(user);
      return username === null ? [] : [{ id: user.id, username }];
    });
  });
