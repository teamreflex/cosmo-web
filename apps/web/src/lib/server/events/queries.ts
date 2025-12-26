import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/server/db";

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
 * Fetches an era by slug along with its events.
 */
export const $fetchEraBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    return db.query.eras.findFirst({
      where: { slug: data.slug },
      with: {
        events: true,
      },
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
    return db.query.events.findFirst({
      where: { slug: data.slug },
      with: {
        era: true,
        collections: true,
      },
    });
  });

/**
 * Fetches all events for a collection.
 */
export const $fetchEventsForCollection = createServerFn({ method: "GET" })
  .inputValidator(z.object({ collectionSlug: z.string() }))
  .handler(async ({ data }) => {
    const collections = await db.query.eventCollections.findMany({
      where: { collectionSlug: data.collectionSlug },
      with: {
        event: {
          with: {
            era: true,
          },
        },
      },
    });

    return collections.map((ec) => ({
      ...ec.event,
      collectionDescription: ec.description,
      collectionCategory: ec.category,
    }));
  });

/**
 * Fetches all collections for an event.
 */
export const $fetchCollectionsForEvent = createServerFn({ method: "GET" })
  .inputValidator(z.object({ eventId: z.uuid() }))
  .handler(async ({ data }) => {
    return db.query.eventCollections.findMany({
      where: { eventId: data.eventId },
    });
  });
