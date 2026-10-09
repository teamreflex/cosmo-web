import { auth } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { staffMiddleware } from "@/lib/server/middlewares";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import type { AdminApiKey, UserSearchResult } from "@/lib/universal/api-keys";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  createApiKeySchema,
  deleteApiKeySchema,
  searchUsersSchema,
  updateApiKeySchema,
} from "@/lib/universal/schema/api-keys";
import { apikey } from "@apollo/database/web/schema";
import type { StaffAuditDetail } from "@apollo/database/web/types";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

/**
 * Search linked COSMO accounts by username to pick an API key owner. Deleted
 * users keep their link, so they are left out explicitly.
 */
export const $searchUsers = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(searchUsersSchema)
  .handler(async ({ data }) => {
    // escape LIKE wildcards so they match literally
    const pattern = `${data.query.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await db.query.cosmoAccounts.findMany({
      where: {
        username: { ilike: pattern },
        userId: { isNotNull: true },
        user: { deletedAt: { isNull: true } },
      },
      columns: { username: true },
      with: {
        user: { columns: { id: true, username: true, displayUsername: true } },
      },
      limit: 10,
    });

    return rows.flatMap((row) => {
      if (!row.user) {
        return [];
      }
      const result: UserSearchResult = {
        id: row.user.id,
        cosmoUsername: row.username,
        username: row.user.displayUsername ?? row.user.username,
      };
      return [result];
    });
  });

/**
 * List every API key with its owner, newest first.
 */
export const $listApiKeys = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .handler(async () => {
    const rows = await db.query.apikey.findMany({
      with: {
        user: { columns: { id: true, username: true, displayUsername: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      start: row.start,
      enabled: row.enabled ?? true,
      requestCount: row.requestCount ?? 0,
      lastRequest: row.lastRequest,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      owner: {
        id: row.user.id,
        username: row.user.displayUsername ?? row.user.username,
      },
    })) satisfies AdminApiKey[];
  });

/**
 * Create an API key on behalf of a user. Server-side `auth.api.createApiKey`
 * with no headers is the only path that honors an arbitrary `userId`; the full
 * key is returned once for the admin to copy. The plugin writes the key
 * outside our transaction, so the audit row follows it.
 */
export const $createApiKey = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(createApiKeySchema)
  .handler(async ({ data, context }) => {
    const owner = await db.query.user.findFirst({
      where: { id: data.userId, deletedAt: { isNull: true } },
      columns: { id: true },
    });
    if (!owner) {
      throw new ExpectedError("user_not_found");
    }

    const result = await auth.api.createApiKey({
      body: {
        userId: data.userId,
        name: data.name,
        expiresIn: data.expiresInDays ? data.expiresInDays * 86400 : undefined,
      },
    });

    await recordStaffAudit(db, {
      staffId: context.session.user.id,
      action: "api-key:create",
      apiKeyId: result.id,
      detail: {
        kind: "api-key",
        name: result.name,
        ownerId: data.userId,
        enabled: result.enabled,
      },
    });

    return { key: result.key };
  });

/**
 * The columns an API key's audit detail copies.
 */
const auditedKeyColumns = {
  id: apikey.id,
  name: apikey.name,
  ownerId: apikey.referenceId,
  enabled: apikey.enabled,
};

/**
 * Rename or enable/disable an existing API key. The plugin's update endpoint is
 * session-scoped to the caller, so admin edits go directly through Drizzle.
 */
export const $updateApiKey = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(updateApiKeySchema)
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(apikey)
        .set({ name: data.name, enabled: data.enabled, updatedAt: new Date() })
        .where(eq(apikey.id, data.id))
        .returning(auditedKeyColumns);
      if (!updated) {
        throw new ExpectedError("api_key_not_found");
      }

      await recordStaffAudit(tx, {
        staffId: context.session.user.id,
        action: "api-key:update",
        apiKeyId: updated.id,
        detail: toKeyDetail(updated),
      });
    });
  });

/**
 * Delete an API key.
 */
export const $deleteApiKey = createServerFn({ method: "POST" })
  .middleware([staffMiddleware({ site: ["manage"] })])
  .validator(deleteApiKeySchema)
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(apikey)
        .where(eq(apikey.id, data.id))
        .returning(auditedKeyColumns);
      if (!deleted) {
        throw new ExpectedError("api_key_not_found");
      }

      await recordStaffAudit(tx, {
        staffId: context.session.user.id,
        action: "api-key:delete",
        apiKeyId: deleted.id,
        detail: toKeyDetail(deleted),
      });
    });
  });

function toKeyDetail(key: {
  name: string | null;
  ownerId: string;
  enabled: boolean | null;
}): Extract<StaffAuditDetail, { kind: "api-key" }> {
  return {
    kind: "api-key",
    name: key.name,
    ownerId: key.ownerId,
    // the column defaults to true
    enabled: key.enabled ?? true,
  };
}
