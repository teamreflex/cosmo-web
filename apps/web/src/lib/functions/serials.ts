import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { adminMiddleware } from "@/lib/server/middlewares";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  confirmSerialSchema,
  deleteSerialConfirmationSchema,
} from "@/lib/universal/schema/serials";
import type { AdminSerialConfirmation } from "@/lib/universal/serials";
import {
  collections,
  objekts,
  serialConfirmations,
} from "@apollo/database/indexer/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, sql } from "drizzle-orm";

/**
 * List every serial confirmation, newest first, alongside the objekt's stored
 * serial so staff can see whether the indexer has applied it yet.
 */
export const $listSerialConfirmations = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const rows = await indexer
      .select({
        tokenId: serialConfirmations.tokenId,
        confirmedSerial: serialConfirmations.serial,
        confirmedBy: serialConfirmations.confirmedBy,
        confirmedAt: serialConfirmations.confirmedAt,
        storedSerial: objekts.serial,
        slug: collections.slug,
      })
      .from(serialConfirmations)
      .leftJoin(objekts, eq(objekts.id, serialConfirmations.tokenId))
      .leftJoin(collections, eq(collections.id, objekts.collectionId))
      .orderBy(
        desc(serialConfirmations.confirmedAt),
        desc(serialConfirmations.tokenId),
      );

    const userIds = [...new Set(rows.flatMap((row) => row.confirmedBy ?? []))];
    const users =
      userIds.length === 0
        ? []
        : await db.query.user.findMany({
            where: { id: { in: userIds } },
            columns: { id: true, username: true, displayUsername: true },
          });
    const usernames = new Map(
      users.map((user) => [user.id, user.displayUsername ?? user.username]),
    );

    return rows.map((row) => ({
      tokenId: row.tokenId,
      confirmedSerial: row.confirmedSerial,
      // the indexer schema stores timestamps as Postgres-formatted strings
      confirmedAt: new Date(row.confirmedAt),
      objekt:
        row.storedSerial !== null && row.slug !== null
          ? { serial: row.storedSerial, slug: row.slug }
          : null,
      confirmedBy:
        row.confirmedBy === null
          ? null
          : {
              id: row.confirmedBy,
              username: usernames.get(row.confirmedBy) ?? null,
            },
    })) satisfies AdminSerialConfirmation[];
  });

/**
 * Record a confirmed serial for an objekt. Only `serial_confirmation` is
 * written; the indexer recomputes the objekt's collection once it notices the
 * confirmation differs from the stored serial.
 */
export const $confirmSerial = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(confirmSerialSchema)
  .handler(async ({ data, context }) => {
    const objekt = await indexer.query.objekts.findFirst({
      where: { id: data.tokenId },
      columns: { id: true },
    });
    if (!objekt) {
      throw new ExpectedError("objekt_not_found");
    }

    await indexer
      .insert(serialConfirmations)
      .values({
        tokenId: data.tokenId,
        serial: data.serial,
        confirmedBy: context.session.user.id,
      })
      .onConflictDoUpdate({
        target: serialConfirmations.tokenId,
        set: {
          serial: data.serial,
          confirmedBy: context.session.user.id,
          confirmedAt: sql`now()`,
        },
      });
  });

/**
 * Delete a serial confirmation. The objekt keeps its current serial until the
 * indexer next recomputes its collection.
 */
export const $deleteSerialConfirmation = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(deleteSerialConfirmationSchema)
  .handler(async ({ data }) => {
    const [deleted] = await indexer
      .delete(serialConfirmations)
      .where(eq(serialConfirmations.tokenId, data.tokenId))
      .returning({ tokenId: serialConfirmations.tokenId });
    if (!deleted) {
      throw new ExpectedError("serial_confirmation_not_found");
    }
  });
