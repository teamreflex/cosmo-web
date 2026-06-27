import { $fetchFilterData } from "@/lib/functions/core";
import { indexer } from "@/lib/server/db/indexer";
import { adminMiddleware } from "@/lib/server/middlewares";
import {
  generateCollectionMediaKey,
  getPresignedUploadUrl,
} from "@/lib/server/r2.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { updateCollectionSchema } from "@/lib/universal/schema/collections";
import { fetchMetadataV3 } from "@apollo/cosmo/server/metadata";
import { normalizeV3 } from "@apollo/cosmo/types/metadata";
import { collections } from "@apollo/database/indexer/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Fetch a single collection by its slug for the admin editor.
 */
export const $fetchCollectionBySlug = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const collection = await indexer.query.collections.findFirst({
      where: { slug: data.slug },
    });

    return collection ?? null;
  });

/**
 * Refetch a collection's metadata from COSMO via one of its objekts, returning
 * only the fields the v3 endpoint reliably provides for the editor to apply.
 */
export const $refetchCollectionFromCosmo = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const objekt = await indexer.query.objekts.findFirst({
      where: { collectionId: data.id },
      columns: { id: true },
    });

    if (!objekt) {
      throw new ExpectedError("collection_no_objekt");
    }

    try {
      const v3 = await fetchMetadataV3(objekt.id, getRequestSignal());
      var metadata = normalizeV3(v3, objekt.id);
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
      throw new ExpectedError("metadata_fetch_failed");
    }

    return {
      artist: metadata.objekt.artists[0] ?? "",
      member: metadata.objekt.member,
      season: metadata.objekt.season,
      collectionNo: metadata.objekt.collectionNo,
      class: metadata.objekt.class,
      backgroundColor: metadata.objekt.backgroundColor,
    };
  });

/**
 * Update an existing collection. Slug and collectionId are immutable and left
 * untouched; season/class are validated against the chosen artist.
 */
export const $updateCollection = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(updateCollectionSchema)
  .handler(async ({ data }) => {
    const artist = data.artist.toLowerCase();
    const collectionNo = data.collectionNo.toUpperCase();

    const { seasons, classes } = await $fetchFilterData();

    const artistSeasons =
      seasons.find((s) => s.artistId === artist)?.seasons ?? [];
    if (!artistSeasons.includes(data.season)) {
      throw new ExpectedError("invalid_season_for_artist");
    }

    const artistClasses =
      classes.find((c) => c.artistId === artist)?.classes ?? [];
    if (!artistClasses.includes(data.class)) {
      throw new ExpectedError("invalid_class_for_artist");
    }

    const [updated] = await indexer
      .update(collections)
      .set({
        artist,
        member: data.member,
        season: data.season,
        class: data.class,
        collectionNo,
        textColor: data.textColor,
        backgroundColor: data.backgroundColor,
        accentColor: data.accentColor,
        onOffline: data.onOffline,
        hasAudio: data.hasAudio,
        frontMedia: data.frontMedia,
      })
      .where(eq(collections.id, data.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update collection");
    }

    return updated;
  });

/**
 * Get a presigned URL for uploading collection media (mp4) to R2. The key is
 * derived from the slug + artist + class (Motion → mco/, Double → dco/).
 */
export const $getCollectionMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      slug: z.string().min(1),
      artist: z.string().min(1),
      objektClass: z.enum(["Motion", "Double"]),
      contentType: z.literal("video/mp4"),
      contentLength: z.number().min(1).max(MAX_MEDIA_SIZE),
    }),
  )
  .handler(async ({ data }) => {
    const key = generateCollectionMediaKey(
      data.artist.toLowerCase(),
      data.slug,
      data.objektClass,
    );

    return getPresignedUploadUrl({
      key,
      contentType: data.contentType,
      contentLength: data.contentLength,
      maxSize: MAX_MEDIA_SIZE,
    });
  });
