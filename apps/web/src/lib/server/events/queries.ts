import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@apollo/database/indexer/schema";
import type { Collection } from "@apollo/database/indexer/types";
import { collectionData, events } from "@apollo/database/web/schema";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";
import { adminMiddleware } from "../middlewares";

/**
 * Fetches all eras.
 */
export const $fetchEras = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    return db.query.eras.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

/**
 * Fetches all events.
 */
export const $fetchEvents = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    return db.query.events.findMany({
      orderBy: { createdAt: "desc" },
      with: {
        era: true,
      },
    });
  });

/**
 * Fetches all collections for an event (admin use).
 */
export const $fetchCollectionsForEvent = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    return db.query.collectionData.findMany({
      where: { eventId: data.eventId },
    });
  });

/**
 * Fetches an event by slug along with its era and collections.
 */
export const $fetchEventBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const result = await db.query.events.findFirst({
      where: { slug: data.slug },
      with: {
        era: true,
        collections: true,
      },
    });

    if (!result) {
      throw notFound();
    }

    return result;
  });

/**
 * Fetches paginated events with timestamp-based cursor.
 */
export const $fetchPaginatedEvents = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artists: z.array(z.string()).optional(),
      cursor: z.iso.datetime().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const PER_PAGE_EVENTS = 24;

    const whereClause: Record<string, unknown> = {};
    if (data.artists?.length) {
      whereClause.artist = { in: data.artists };
    }
    if (data.cursor) {
      whereClause.startDate = { lt: data.cursor };
    }

    const allEvents = await db.query.events.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { startDate: "desc" },
      with: { era: true },
      limit: PER_PAGE_EVENTS,
    });

    const hasNext = allEvents.length === PER_PAGE_EVENTS;
    const lastEvent = allEvents[allEvents.length - 1];
    const nextStartAfter = hasNext
      ? lastEvent?.startDate?.toISOString()
      : undefined;

    return {
      events: allEvents,
      nextStartAfter,
    };
  });

/**
 * Fetches active events (currently ongoing).
 */
export const $fetchActiveEvents = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artists: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const now = new Date();

    const whereClause: Record<string, unknown> = {
      startDate: { lte: now },
      OR: [{ endDate: { isNull: true } }, { endDate: { gte: now } }],
    };
    if (data.artists?.length) {
      whereClause.artist = { in: data.artists };
    }

    return db.query.events.findMany({
      where: whereClause,
      orderBy: { startDate: "desc" },
      with: { era: true },
    });
  });

/**
 * Fetches paginated objekt collections for an event.
 */
export const $fetchEventObjekts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      eventSlug: z.string(),
      cursor: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // single query: join events + collection_data with count over window
    const rows = await db
      .select({
        collectionId: collectionData.collectionId,
        description: collectionData.description,
        total: sql<number>`count(*) over()`.as("total"),
      })
      .from(collectionData)
      .innerJoin(events, eq(collectionData.eventId, events.id))
      .where(eq(events.slug, data.eventSlug))
      .orderBy(asc(collectionData.collectionId))
      .limit(60)
      .offset(data.cursor ?? 0);

    if (rows.length === 0) {
      return {
        hasNext: false,
        total: 0,
        objekts: [],
        nextStartAfter: undefined,
      };
    }

    const total = rows[0]?.total ?? 0;

    const slugs = rows.map((r) => r.collectionId);
    const indexerCollections = await indexer
      .select()
      .from(collections)
      .where(inArray(collections.slug, slugs));

    const collectionMap = new Map(indexerCollections.map((c) => [c.slug, c]));
    const objekts = rows
      .map((row) => collectionMap.get(row.collectionId))
      .filter((o): o is Collection => !!o);

    const nextOffset = (data.cursor ?? 0) + rows.length;
    const hasNext = nextOffset < total;

    return {
      hasNext,
      total,
      objekts,
      nextStartAfter: hasNext ? nextOffset : undefined,
    };
  });
