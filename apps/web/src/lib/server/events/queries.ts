import * as z from "zod";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { collections } from "@apollo/database/indexer/schema";
import { collectionData, events } from "@apollo/database/web/schema";
import { notFound } from "@tanstack/react-router";
import { adminMiddleware } from "../middlewares";
import type { Collection } from "@apollo/database/indexer/types";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";

/**
 * Fetches all eras, optionally filtered by artist.
 */
export const $fetchEras = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artist: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return db.query.eras.findMany({
      where: data.artist ? { artist: data.artist } : undefined,
      orderBy: { createdAt: "desc" },
    });
  });

/**
 * Fetches all events, optionally filtered by artist and/or era.
 */
export const $fetchEvents = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artist: z.string().optional(),
      eraId: z.uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return db.query.events.findMany({
      where: {
        ...(data.artist && { artist: data.artist }),
        ...(data.eraId && { eraId: data.eraId }),
      },
      orderBy: { createdAt: "desc" },
      with: {
        era: true,
      },
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

const PER_PAGE = 30;

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
      .limit(PER_PAGE)
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
