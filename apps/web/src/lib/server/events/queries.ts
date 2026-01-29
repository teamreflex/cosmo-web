import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@apollo/database/indexer/schema";
import { collectionData, eras, events } from "@apollo/database/web/schema";
import { eventTypeKeys } from "@apollo/database/web/types";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import * as z from "zod";
import { adminMiddleware } from "../middlewares";

/**
 * Fetches all eras (admin).
 */
export const $fetchEras = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    return db.query.eras.findMany({
      orderBy: { startDate: "desc" },
    });
  });

/**
 * Fetches all eras with minimal data for filters.
 */
export const $fetchErasForFilter = createServerFn({ method: "GET" }).handler(
  async () => {
    return db
      .select({
        id: eras.id,
        name: eras.name,
        imageUrl: eras.imageUrl,
        spotifyAlbumArt: eras.spotifyAlbumArt,
        artist: eras.artist,
      })
      .from(eras)
      .orderBy(asc(eras.startDate));
  },
);

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
 * Fetches an event by slug along with its era.
 */
export const $fetchEventBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const result = await db.query.events.findFirst({
      where: { slug: data.slug },
      with: {
        era: true,
      },
    });

    if (!result) {
      throw notFound();
    }

    return result;
  });

/**
 * Fetches paginated events with timestamp-based cursor and filters.
 */
export const $fetchPaginatedEvents = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      artists: z.array(z.string()).optional(),
      cursor: z.iso.datetime().optional(),
      sort: z.enum(["newest", "oldest"]).optional(),
      era: z.string().optional(),
      season: z.array(z.string()).optional(),
      eventType: z.enum(eventTypeKeys).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const PER_PAGE_EVENTS = 24;
    const isAscending = data.sort === "oldest";

    const conditions = [];
    if (data.artists?.length) {
      conditions.push(inArray(events.artist, data.artists));
    }
    if (data.era) {
      conditions.push(eq(events.eraId, data.era));
    }
    if (data.season?.length) {
      // Check if JSONB array contains any of the specified seasons
      // @> requires both sides to be arrays: '["a","b"]' @> '["a"]'
      conditions.push(
        sql`(${sql.join(
          data.season.map(
            (s) => sql`${events.seasons} @> ${JSON.stringify([s])}::jsonb`,
          ),
          sql` OR `,
        )})`,
      );
    }
    if (data.eventType) {
      conditions.push(eq(events.eventType, data.eventType));
    }
    if (data.cursor) {
      conditions.push(
        isAscending
          ? gt(events.startDate, new Date(data.cursor))
          : lt(events.startDate, new Date(data.cursor)),
      );
    }

    const rows = await db
      .select({
        event: events,
        era: eras,
      })
      .from(events)
      .innerJoin(eras, eq(events.eraId, eras.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(isAscending ? asc(events.startDate) : desc(events.startDate))
      .limit(PER_PAGE_EVENTS);

    const allEvents = rows.map((row) => ({
      ...row.event,
      era: row.era,
    }));

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
    const objekts = await indexer
      .select()
      .from(collections)
      .where(inArray(collections.slug, slugs))
      .orderBy(asc(collections.createdAt));

    const nextOffset = (data.cursor ?? 0) + rows.length;
    const hasNext = nextOffset < total;

    return {
      hasNext,
      total,
      objekts,
      nextStartAfter: hasNext ? nextOffset : undefined,
    };
  });
