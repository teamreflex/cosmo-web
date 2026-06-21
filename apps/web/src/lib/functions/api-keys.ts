import { auth } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { adminMiddleware } from "@/lib/server/middlewares";
import type { AdminApiKey, UserSearchResult } from "@/lib/universal/api-keys";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  createApiKeySchema,
  deleteApiKeySchema,
  searchUsersSchema,
  updateApiKeySchema,
} from "@/lib/universal/schema/api-keys";
import { apikey } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

/**
 * Search app users by username/display username to pick an API key owner.
 */
export const $searchUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(searchUsersSchema)
  .handler(async ({ data }) => {
    const rows = await db.query.user.findMany({
      where: {
        OR: [
          { username: { ilike: `${data.query}%` } },
          { displayUsername: { ilike: `${data.query}%` } },
        ],
      },
      columns: { id: true, username: true, displayUsername: true, image: true },
      limit: 10,
    });

    return rows.map((user) => ({
      id: user.id,
      username: user.displayUsername ?? user.username,
      image: user.image,
    })) satisfies UserSearchResult[];
  });

/**
 * List every API key with its owner, newest first.
 */
export const $listApiKeys = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
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
      prefix: row.prefix,
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
 * key is returned once for the admin to copy.
 */
export const $createApiKey = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(createApiKeySchema)
  .handler(async ({ data }) => {
    const owner = await db.query.user.findFirst({
      where: { id: data.userId },
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

    return { key: result.key };
  });

/**
 * Rename or enable/disable an existing API key. The plugin's update endpoint is
 * session-scoped to the caller, so admin edits go directly through Drizzle.
 */
export const $updateApiKey = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(updateApiKeySchema)
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(apikey)
      .set({ name: data.name, enabled: data.enabled, updatedAt: new Date() })
      .where(eq(apikey.id, data.id))
      .returning({ id: apikey.id });
    if (!updated) {
      throw new ExpectedError("api_key_not_found");
    }
  });

/**
 * Delete an API key.
 */
export const $deleteApiKey = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(deleteApiKeySchema)
  .handler(async ({ data }) => {
    const [deleted] = await db
      .delete(apikey)
      .where(eq(apikey.id, data.id))
      .returning({ id: apikey.id });
    if (!deleted) {
      throw new ExpectedError("api_key_not_found");
    }
  });
