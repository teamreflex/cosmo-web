import { transferCosmoAccount } from "@/lib/server/cosmo-transfer.server";
import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import {
  apolloUsername,
  namedUserColumns,
} from "@/lib/server/staff-users.server";
import { prefixPattern } from "@/lib/server/util.server";
import type {
  CosmoTransferSource,
  CosmoTransferTarget,
} from "@/lib/universal/cosmo-transfer";
import { adminSearchSchema } from "@/lib/universal/schema/admin";
import { transferCosmoAccountSchema } from "@/lib/universal/schema/cosmo-transfer";
import { cosmoAccounts } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, notExists } from "drizzle-orm";

/**
 * Move a COSMO account's link to another user.
 */
export const $transferCosmoAccount = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ cosmo: ["transfer"] })])
  .validator(transferCosmoAccountSchema)
  .handler(({ data, context }) =>
    transferCosmoAccount(context.session.user.id, data),
  );

/**
 * Linked COSMO accounts by username, for the Move dialog's From.
 */
export const $searchCosmoTransferSources = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ cosmo: ["transfer"] })])
  .validator(adminSearchSchema)
  .handler(async ({ data }) => {
    const rows = await db.query.cosmoAccounts.findMany({
      where: {
        username: { ilike: prefixPattern(data.query) },
        userId: { isNotNull: true },
      },
      columns: { address: true, username: true },
      with: { user: { columns: { id: true } } },
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
              ownerId: row.user.id,
            },
          ],
    );
  });

/**
 * Users without a COSMO link, by username or name, for the Move
 * dialog's To.
 */
export const $searchCosmoTransferTargets = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ cosmo: ["transfer"] })])
  .validator(adminSearchSchema)
  .handler(async ({ data }) => {
    const pattern = prefixPattern(data.query);
    const users = await db.query.user.findMany({
      where: {
        OR: [
          { username: { ilike: pattern } },
          { displayUsername: { ilike: pattern } },
          { name: { ilike: pattern } },
        ],
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

    return users.map((user): CosmoTransferTarget => ({
      id: user.id,
      username: apolloUsername(user),
    }));
  });
