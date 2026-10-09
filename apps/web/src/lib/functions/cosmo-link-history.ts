import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import {
  namedUserColumns,
  staffUsername,
} from "@/lib/server/staff-users.server";
import { prefixPattern } from "@/lib/server/util.server";
import type {
  CosmoLinkHistoryAccount,
  CosmoLinkHistoryEntry,
} from "@/lib/universal/cosmo-link-history";
import { COSMO_TRANSFER_PERMISSIONS } from "@/lib/universal/cosmo-transfer";
import { adminSearchSchema } from "@/lib/universal/schema/admin";
import { cosmoLinkAudit } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";
import * as z from "zod";

/**
 * COSMO accounts with link history, by username, for the history picker.
 */
export const $searchCosmoLinkHistory = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(adminSearchSchema)
  .handler(({ data }): Promise<CosmoLinkHistoryAccount[]> =>
    db.query.cosmoAccounts.findMany({
      where: {
        username: { ilike: prefixPattern(data.query) },
        RAW: (t) =>
          inArray(
            t.id,
            db
              .select({ id: cosmoLinkAudit.cosmoAccountId })
              .from(cosmoLinkAudit),
          ),
      },
      columns: { id: true, address: true, username: true },
      limit: 10,
    }),
  );

/**
 * Every link and unlink of one COSMO account, newest first. Events written
 * in one transaction share a timestamp, so the id orders them.
 */
export const $fetchCosmoLinkHistory = createServerFn({ method: "GET" })
  .middleware([staffMiddleware(COSMO_TRANSFER_PERMISSIONS)])
  .validator(z.object({ cosmoAccountId: z.number().int() }))
  .handler(async ({ data }) => {
    const rows = await db.query.cosmoLinkAudit.findMany({
      where: { cosmoAccountId: data.cosmoAccountId },
      columns: { id: true, createdAt: true, event: true, reason: true },
      with: {
        user: { columns: { id: true, ...namedUserColumns } },
        staff: { columns: namedUserColumns },
      },
      orderBy: { id: "desc" },
    });

    return rows.map((row): CosmoLinkHistoryEntry => ({
      id: row.id,
      createdAt: row.createdAt,
      event: row.event,
      user: { id: row.user.id, username: staffUsername(row.user) },
      reason:
        row.reason === "staff-move"
          ? {
              kind: "staff-move",
              staff: row.staff === null ? null : staffUsername(row.staff),
            }
          : { kind: row.reason },
    }));
  });
