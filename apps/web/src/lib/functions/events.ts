import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  validateEraSlug,
  validateEventSlug,
} from "@/lib/server/events/actions.server";
import { extractDominantColor } from "@/lib/server/events/color-extraction.server";
import {
  fetchSpotifyAlbum,
  getBestAlbumArt,
  searchSpotifyAlbums,
} from "@/lib/server/events/spotify.server";
import { adminMiddleware } from "@/lib/server/middlewares";
import {
  generateEraImageKey,
  generateEventImageKey,
  getPresignedUploadUrl,
} from "@/lib/server/r2.server";
import {
  addCollectionsToEventSchema,
  createEraSchema,
  createEventSchema,
  removeCollectionFromEventSchema,
  updateEraSchema,
  updateEventSchema,
} from "@/lib/universal/schema/events";
import { collections } from "@apollo/database/indexer/schema";
import { collectionData, eras, events } from "@apollo/database/web/schema";
import { eventTypeKeys } from "@apollo/database/web/types";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import * as z from "zod";

/**
 * Creates a new era.
 */
export const $createEra = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createEraSchema)
  .handler(async ({ data }) => {
    await validateEraSlug(data.slug);

    const imageUrl = data.imageUrl || data.spotifyAlbumArt || null;
    const dominantColor = await extractDominantColor(imageUrl);

    const [era] = await db
      .insert(eras)
      .values({
        slug: data.slug,
        name: data.name,
        description: data.description,
        artist: data.artist,
        spotifyAlbumId: data.spotifyAlbumId,
        spotifyAlbumArt: data.spotifyAlbumArt,
        imageUrl: data.imageUrl,
        dominantColor,
        startDate: data.startDate,
        endDate: data.endDate,
      })
      .returning();

    if (!era) {
      throw new Error("Failed to create era");
    }

    return era;
  });

/**
 * Updates an era.
 */
export const $updateEra = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateEraSchema)
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    if (updateData.slug !== undefined) {
      await validateEraSlug(updateData.slug, id);
    }

    const imageUrl = updateData.imageUrl || updateData.spotifyAlbumArt || null;
    const dominantColor = await extractDominantColor(imageUrl);

    const [era] = await db
      .update(eras)
      .set({
        ...updateData,
        dominantColor,
      })
      .where(eq(eras.id, id))
      .returning();

    if (!era) {
      throw new Error("Failed to update era");
    }

    return era;
  });

/**
 * Deletes an era.
 */
export const $deleteEra = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await db.delete(eras).where(eq(eras.id, data.id));
    return { success: true };
  });

/**
 * Creates a new event.
 */
export const $createEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createEventSchema)
  .handler(async ({ data }) => {
    await validateEventSlug(data.slug);

    const dominantColor = await extractDominantColor(data.imageUrl || null);

    const [event] = await db
      .insert(events)
      .values({
        slug: data.slug,
        name: data.name,
        description: data.description,
        artist: data.artist,
        eventType: data.eventType,
        eraId: data.eraId,
        twitterUrl: data.twitterUrl,
        startDate: data.startDate,
        endDate: data.endDate,
        imageUrl: data.imageUrl,
        dominantColor,
        seasons: data.seasons,
      })
      .returning();

    if (!event) {
      throw new Error("Failed to create event");
    }

    return event;
  });

/**
 * Updates an event.
 */
export const $updateEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateEventSchema)
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    if (updateData.slug !== undefined) {
      await validateEventSlug(updateData.slug, id);
    }

    const dominantColor = await extractDominantColor(
      updateData.imageUrl || null,
    );

    const [event] = await db
      .update(events)
      .set({
        ...updateData,
        dominantColor,
      })
      .where(eq(events.id, id))
      .returning();

    if (!event) {
      throw new Error("Failed to update event");
    }

    return event;
  });

/**
 * Deletes an event.
 */
export const $deleteEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await db.delete(events).where(eq(events.id, data.id));
    return { success: true };
  });

/**
 * Adds collections to an event.
 */
export const $addCollectionsToEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(addCollectionsToEventSchema)
  .handler(async ({ data, context }) => {
    const result = await db
      .insert(collectionData)
      .values(
        data.collections.map((c) => ({
          eventId: data.eventId,
          collectionId: c.collectionId,
          description: c.description,
          contributor: context.cosmo.address,
        })),
      )
      .onConflictDoUpdate({
        target: collectionData.collectionId,
        set: {
          eventId: data.eventId,
          description: sql`COALESCE(excluded.${sql.raw(collectionData.description.name)}, ${collectionData.description})`,
        },
      })
      .returning();

    return result.length;
  });

/**
 * Removes a collection from an event.
 */
export const $removeCollectionFromEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(removeCollectionFromEventSchema)
  .handler(async ({ data }) => {
    await db
      .update(collectionData)
      .set({ eventId: null })
      .where(
        and(
          eq(collectionData.eventId, data.eventId),
          eq(collectionData.collectionId, data.collectionId),
        ),
      );
  });

/**
 * Searches for albums on Spotify.
 */
export const $searchSpotifyAlbums = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data }) => {
    return searchSpotifyAlbums(data.query);
  });

/**
 * Gets a Spotify album.
 */
export const $getSpotifyAlbum = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ albumId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const album = await fetchSpotifyAlbum(data.albumId);
    if (!album) return null;

    return {
      ...album,
      bestArt: getBestAlbumArt(album),
    };
  });

/**
 * Gets a presigned URL for uploading an era image to R2.
 */
export const $getEraImageUploadUrl = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      filename: z.string().min(1),
      contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
      contentLength: z
        .number()
        .min(1)
        .max(1024 * 1024), // 1MB max
    }),
  )
  .handler(async ({ data }) => {
    const extension = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const key = generateEraImageKey(extension);

    const { uploadUrl, publicUrl } = getPresignedUploadUrl({
      key,
      contentType: data.contentType,
      contentLength: data.contentLength,
    });

    return { uploadUrl, publicUrl };
  });

/**
 * Gets a presigned URL for uploading an event image to R2.
 */
export const $getEventImageUploadUrl = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      filename: z.string().min(1),
      contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
      contentLength: z
        .number()
        .min(1)
        .max(1024 * 1024), // 1MB max
    }),
  )
  .handler(async ({ data }) => {
    const extension = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const key = generateEventImageKey(extension);

    const { uploadUrl, publicUrl } = getPresignedUploadUrl({
      key,
      contentType: data.contentType,
      contentLength: data.contentLength,
    });

    return { uploadUrl, publicUrl };
  });

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
