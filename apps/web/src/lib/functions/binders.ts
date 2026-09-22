import {
  clearBinderPinCache,
  fetchBinderPreviewImages,
  lockOwnedBinder,
} from "@/lib/server/binders.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import {
  COLLAGE_SIZE,
  isPocketInRange,
  MAX_BINDER_PAGES,
  MAX_BINDERS,
  resolveBinderArtwork,
} from "@/lib/universal/binders";
import type { BinderDetail, BinderPreview } from "@/lib/universal/binders";
import { ExpectedError } from "@/lib/universal/errors/expected";
import {
  binderIdSchema,
  clearPocketSchema,
  createBinderSchema,
  placeObjektSchema,
  swapPocketsSchema,
  updateBinderSchema,
} from "@/lib/universal/schema/binder";
import { createSlug } from "@/lib/utils";
import { binderEntries, binders } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lt, or, sql } from "drizzle-orm";
import * as z from "zod";
import { normalizePin } from "./pins";

/**
 * Fetch a user's binders for the profile shelf, each with its cover artwork.
 */
export const $fetchBinderShelf = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }): Promise<BinderPreview[]> => {
    const rows = await db.query.binders.findMany({
      where: { userId: data.userId },
      orderBy: { createdAt: "asc" },
      columns: {
        id: true,
        slug: true,
        name: true,
        colour: true,
        layout: true,
        pageCount: true,
        coverTokenId: true,
      },
      extras: {
        entryCount: (table) =>
          db.$count(binderEntries, eq(binderEntries.binderId, table.id)),
      },
      with: {
        entries: {
          columns: { page: true, slot: true, tokenId: true },
          where: { page: 0 },
          orderBy: { slot: "asc" },
          limit: COLLAGE_SIZE,
        },
      },
    });

    const images = await fetchBinderPreviewImages(
      rows.flatMap((row) => [
        ...(row.coverTokenId === null ? [] : [row.coverTokenId]),
        ...row.entries.map((entry) => entry.tokenId),
      ]),
    );

    return rows.map(({ coverTokenId, entries, ...binder }) => ({
      ...binder,
      artwork: resolveBinderArtwork(coverTokenId, entries, images),
    }));
  });

/**
 * Fetch one binder with every page's entries, hydrated from the indexer.
 */
export const $fetchBinder = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string(), slug: z.string() }))
  .handler(async ({ data }): Promise<BinderDetail | undefined> => {
    const binder = await db.query.binders.findFirst({
      where: { userId: data.userId, slug: data.slug },
      with: {
        entries: {
          columns: { page: true, slot: true, tokenId: true },
          orderBy: { page: "asc", slot: "asc" },
        },
      },
    });
    if (!binder) return undefined;

    const objekts =
      binder.entries.length > 0
        ? await indexer.query.objekts.findMany({
            where: {
              id: { in: binder.entries.map((entry) => String(entry.tokenId)) },
            },
            with: { collection: true },
          })
        : [];
    const byTokenId = new Map(objekts.map((o) => [o.id, normalizePin(o)]));

    return {
      ...binder,
      entries: binder.entries.flatMap(({ tokenId, ...pocket }) => {
        const objekt = byTokenId.get(String(tokenId));
        return objekt === undefined ? [] : [{ ...pocket, objekt }];
      }),
    };
  });

/**
 * Create an empty one-page binder.
 */
export const $createBinder = createServerFn({ method: "POST" })
  .validator(createBinderSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    const count = await db.$count(binders, eq(binders.userId, userId));
    if (count >= MAX_BINDERS) {
      throw new ExpectedError("binder_limit_reached");
    }

    const [result] = await db
      .insert(binders)
      .values({
        userId,
        name: data.name,
        slug: createSlug(data.name),
        layout: data.layout,
        colour: data.colour,
      })
      .onConflictDoNothing({ target: [binders.userId, binders.slug] })
      .returning();

    // a missing row means the (user, slug) unique index suppressed the insert
    if (!result) {
      throw new ExpectedError("binder_name_taken");
    }

    return result;
  });

/**
 * Rename, recolour, set or clear the cover, or change the layout of a binder
 * that has no entries yet.
 */
export const $updateBinder = createServerFn({ method: "POST" })
  .validator(updateBinderSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const slug = data.name === undefined ? undefined : createSlug(data.name);

    const result = await db.transaction(async (tx) => {
      const binder = await lockOwnedBinder(tx, data.binderId, userId);

      if (slug !== undefined) {
        const conflict = await tx.query.binders.findFirst({
          where: { userId, slug, id: { ne: binder.id } },
          columns: { id: true },
        });
        if (conflict !== undefined) {
          throw new ExpectedError("binder_name_taken");
        }
      }

      if (data.layout !== undefined && data.layout !== binder.layout) {
        const entryCount = await tx.$count(
          binderEntries,
          eq(binderEntries.binderId, binder.id),
        );
        if (entryCount > 0) {
          throw new ExpectedError("binder_layout_locked");
        }
      }

      if (data.coverTokenId !== undefined && data.coverTokenId !== null) {
        const entry = await tx.query.binderEntries.findFirst({
          where: { binderId: binder.id, tokenId: data.coverTokenId },
          columns: { page: true },
        });
        if (entry === undefined) {
          throw new ExpectedError("cover_not_in_binder");
        }
      }

      const [row] = await tx
        .update(binders)
        .set({
          name: data.name,
          slug,
          colour: data.colour,
          layout: data.layout,
          coverTokenId: data.coverTokenId,
          updatedAt: new Date(),
        })
        .where(eq(binders.id, binder.id))
        .returning();

      if (!row) {
        throw new Error("Failed to update binder");
      }

      return row;
    });

    await clearBinderPinCache(context.cosmo);
    return result;
  });

/**
 * Delete a binder. Its entries and pins go with it through the cascades.
 */
export const $deleteBinder = createServerFn({ method: "POST" })
  .validator(binderIdSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const deleted = await db
      .delete(binders)
      .where(
        and(
          eq(binders.id, data.binderId),
          eq(binders.userId, context.session.user.id),
        ),
      )
      .returning({ id: binders.id });

    if (deleted.length > 0) {
      await clearBinderPinCache(context.cosmo);
    }
  });

/**
 * Place an owned objekt into a pocket, replacing whatever the pocket held. An
 * objekt sits in one pocket per binder, so it leaves any other pocket first.
 */
export const $placeObjekt = createServerFn({ method: "POST" })
  .validator(placeObjektSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // the indexer can lag a transfer, so a just-received objekt may fail here
    const owned = await indexer.query.objekts.findFirst({
      where: {
        id: String(data.tokenId),
        owner: context.cosmo.address.toLowerCase(),
      },
      columns: { id: true },
    });
    if (owned === undefined) {
      throw new ExpectedError("objekt_not_owned");
    }

    const changesPreview = await db.transaction(async (tx) => {
      const binder = await lockOwnedBinder(
        tx,
        data.binderId,
        context.session.user.id,
      );
      if (!isPocketInRange(binder.layout, binder.pageCount, data)) {
        throw new ExpectedError("pocket_out_of_range");
      }

      const removed = await tx
        .delete(binderEntries)
        .where(
          and(
            eq(binderEntries.binderId, binder.id),
            or(
              eq(binderEntries.tokenId, data.tokenId),
              and(
                eq(binderEntries.page, data.page),
                eq(binderEntries.slot, data.slot),
              ),
            ),
          ),
        )
        .returning({
          page: binderEntries.page,
          tokenId: binderEntries.tokenId,
        });

      await tx.insert(binderEntries).values({
        binderId: binder.id,
        page: data.page,
        slot: data.slot,
        tokenId: data.tokenId,
      });

      // the objekt this one replaced can't stay the cover
      const coverReplaced =
        binder.coverTokenId !== data.tokenId &&
        removed.some((entry) => entry.tokenId === binder.coverTokenId);

      await tx
        .update(binders)
        .set({
          updatedAt: new Date(),
          coverTokenId: coverReplaced ? null : undefined,
        })
        .where(eq(binders.id, binder.id));

      return (
        coverReplaced ||
        data.page === 0 ||
        removed.some((entry) => entry.page === 0)
      );
    });

    if (changesPreview) {
      await clearBinderPinCache(context.cosmo);
    }
  });

/**
 * Empty one pocket. Clearing the cover objekt falls back to the collage.
 */
export const $clearPocket = createServerFn({ method: "POST" })
  .validator(clearPocketSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const changesPreview = await db.transaction(async (tx) => {
      const binder = await lockOwnedBinder(
        tx,
        data.binderId,
        context.session.user.id,
      );

      const [removed] = await tx
        .delete(binderEntries)
        .where(
          and(
            eq(binderEntries.binderId, binder.id),
            eq(binderEntries.page, data.page),
            eq(binderEntries.slot, data.slot),
          ),
        )
        .returning({ tokenId: binderEntries.tokenId });
      if (removed === undefined) return false;

      const coverCleared = removed.tokenId === binder.coverTokenId;
      await tx
        .update(binders)
        .set({
          updatedAt: new Date(),
          coverTokenId: coverCleared ? null : undefined,
        })
        .where(eq(binders.id, binder.id));

      return coverCleared || data.page === 0;
    });

    if (changesPreview) {
      await clearBinderPinCache(context.cosmo);
    }
  });

/**
 * Swap two pockets, or move an objekt when the other pocket is empty. Both
 * rows are deleted and inserted back, so the primary key never collides.
 */
export const $swapPockets = createServerFn({ method: "POST" })
  .validator(swapPocketsSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const { from, to } = data;
    if (from.page === to.page && from.slot === to.slot) return;

    const changesPreview = await db.transaction(async (tx) => {
      const binder = await lockOwnedBinder(
        tx,
        data.binderId,
        context.session.user.id,
      );
      if (
        !isPocketInRange(binder.layout, binder.pageCount, from) ||
        !isPocketInRange(binder.layout, binder.pageCount, to)
      ) {
        throw new ExpectedError("pocket_out_of_range");
      }

      const removed = await tx
        .delete(binderEntries)
        .where(
          and(
            eq(binderEntries.binderId, binder.id),
            or(
              and(
                eq(binderEntries.page, from.page),
                eq(binderEntries.slot, from.slot),
              ),
              and(
                eq(binderEntries.page, to.page),
                eq(binderEntries.slot, to.slot),
              ),
            ),
          ),
        )
        .returning();
      if (removed.length === 0) return false;

      await tx.insert(binderEntries).values(
        removed.map((entry) => {
          const target =
            entry.page === from.page && entry.slot === from.slot ? to : from;
          return { ...entry, page: target.page, slot: target.slot };
        }),
      );

      await tx
        .update(binders)
        .set({ updatedAt: new Date() })
        .where(eq(binders.id, binder.id));

      return from.page === 0 || to.page === 0;
    });

    if (changesPreview) {
      await clearBinderPinCache(context.cosmo);
    }
  });

/**
 * Append an empty page, up to the page cap.
 */
export const $addBinderPage = createServerFn({ method: "POST" })
  .validator(binderIdSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    const [result] = await db
      .update(binders)
      .set({ pageCount: sql`${binders.pageCount} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(binders.id, data.binderId),
          eq(binders.userId, userId),
          lt(binders.pageCount, MAX_BINDER_PAGES),
        ),
      )
      .returning();

    if (!result) {
      const exists = await db.$count(
        binders,
        and(eq(binders.id, data.binderId), eq(binders.userId, userId)),
      );
      throw new ExpectedError(
        exists > 0 ? "binder_page_limit_reached" : "binder_not_found",
      );
    }

    // the cover label shows the page count
    await clearBinderPinCache(context.cosmo);
    return result;
  });

/**
 * Remove the last page and its entries. A binder always keeps its first page,
 * so this does nothing on a one-page binder.
 */
export const $removeLastBinderPage = createServerFn({ method: "POST" })
  .validator(binderIdSchema)
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const result = await db.transaction(async (tx) => {
      const binder = await lockOwnedBinder(
        tx,
        data.binderId,
        context.session.user.id,
      );
      if (binder.pageCount === 1) return undefined;

      const pageCount = binder.pageCount - 1;
      const removed = await tx
        .delete(binderEntries)
        .where(
          and(
            eq(binderEntries.binderId, binder.id),
            gte(binderEntries.page, pageCount),
          ),
        )
        .returning({ tokenId: binderEntries.tokenId });

      const [row] = await tx
        .update(binders)
        .set({
          pageCount,
          updatedAt: new Date(),
          coverTokenId: removed.some(
            (entry) => entry.tokenId === binder.coverTokenId,
          )
            ? null
            : undefined,
        })
        .where(eq(binders.id, binder.id))
        .returning();

      return row;
    });

    if (result !== undefined) {
      // the cover label shows the page count
      await clearBinderPinCache(context.cosmo);
    }
    return result;
  });
