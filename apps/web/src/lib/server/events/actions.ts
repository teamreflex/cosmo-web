import * as z from "zod";
import { and, eq, sql } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { collectionData, eras, events } from "@apollo/database/web/schema";
import {
  fetchSpotifyAlbum,
  getBestAlbumArt,
  searchSpotifyAlbums,
} from "./spotify";
import { db } from "@/lib/server/db";
import { adminMiddleware } from "@/lib/server/middlewares";
import {
  generateEraImageKey,
  getPresignedUploadUrl,
} from "@/lib/server/r2";
import {
  addCollectionsToEventSchema,
  createEraSchema,
  createEventSchema,
  removeCollectionFromEventSchema,
  updateEraSchema,
  updateEventSchema,
} from "@/lib/universal/schema/events";

/**
 * Creates a new era.
 */
export const $createEra = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createEraSchema)
  .handler(async ({ data }) => {
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

    const [era] = await db
      .update(eras)
      .set(updateData)
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

    const [event] = await db
      .update(events)
      .set(updateData)
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
  .handler(async ({ data }) => {
    const result = await db
      .insert(collectionData)
      .values(
        data.collections.map((c) => ({
          eventId: data.eventId,
          collectionId: c.collectionId,
          description: c.description,
        })),
      )
      .onConflictDoUpdate({
        target: collectionData.collectionId,
        set: {
          eventId: data.eventId,
          description: sql.raw(`excluded.${collectionData.description.name}`),
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
      contentLength: z.number().min(1).max(1024 * 1024), // 1MB max
    }),
  )
  .handler(async ({ data }) => {
    const extension = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const key = generateEraImageKey(extension);

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl({
      key,
      contentType: data.contentType,
      contentLength: data.contentLength,
    });

    return { uploadUrl, publicUrl };
  });
