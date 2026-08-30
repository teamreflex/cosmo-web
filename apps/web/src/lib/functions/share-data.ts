import { indexer } from "@/lib/server/db/indexer";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { createLoginTicket } from "@/lib/server/qr-auth.server";
import { uploadCollectionMedia } from "@/lib/server/r2.server";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import { getRequestSignal } from "@/lib/server/request.server";
import { queryTicketSchema } from "@/lib/universal/schema/cosmo";
import {
  scrapeCollectionMediaSchema,
  type ScrapeCandidate,
} from "@/lib/universal/schema/share-data";
import { runCosmo } from "@apollo/cosmo/runtime";
import { fetchObjektSummaries } from "@apollo/cosmo/server/collection";
import { certifyTicket, queryTicket } from "@apollo/cosmo/server/qr-auth";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { collections } from "@apollo/database/indexer/schema";
import { slugifyObjekt } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

/**
 * Generate a COSMO QR login ticket via a headless-browser reCAPTCHA solve.
 * Tightly rate limited per user: every call drives a browserless session.
 */
export const $fetchQrTicket = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    await consumeRateLimit({
      key: `qr-recaptcha:${context.session.user.id}`,
      limit: 5,
      window: "1 minute",
    });

    return await createLoginTicket(getRequestSignal());
  });

/**
 * Query the status of a QR login ticket. Polled while the QR code is shown.
 */
export const $queryQrTicket = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .validator(queryTicketSchema)
  .handler(async ({ data, context }) => {
    await consumeRateLimit({
      key: `qr-ticket:${context.session.user.id}`,
      limit: 60,
      window: "1 minute",
    });

    return await runCosmo(queryTicket(data.ticket), getRequestSignal());
  });

/**
 * Verify COSMO account, fetch the selected collections, and submit media data.
 * Does everything in one server call to avoid CORS issues.
 */
export const $scrapeCollectionMedia = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(scrapeCollectionMediaSchema)
  .handler(async ({ data }) => {
    // safety check: if no collections need to be updated, return early
    const scrapeCandidates = await $fetchScrapeCandidates();
    if (scrapeCandidates.length === 0) {
      return { updated: 0 };
    }
    const missing = new Set(scrapeCandidates.map((c) => c.collectionId));

    // build search queries from the selection, dropping anything that no
    // longer has missing candidates so we don't hit COSMO for nothing
    const queries = data.selection.flatMap<{
      artistId: ValidArtist;
      class: string;
      prop: "frontMedia" | "bandImageUrl";
      seasons?: string[];
    }>((item) => {
      const artist = item.artistId.toLowerCase();
      const available = scrapeCandidates.filter(
        (c) => c.type === item.type && c.artist === artist,
      );

      switch (item.type) {
        case "motion":
          return available.length > 0
            ? [{ artistId: item.artistId, class: "Motion", prop: "frontMedia" }]
            : [];
        case "band":
          return available.length > 0
            ? [{ artistId: item.artistId, class: "Unit", prop: "bandImageUrl" }]
            : [];
        case "audio": {
          const seasons = item.seasons.filter((season) =>
            available.some((c) => c.season === season),
          );
          return seasons.length > 0
            ? [
                {
                  artistId: item.artistId,
                  class: "Double",
                  prop: "frontMedia",
                  seasons,
                },
              ]
            : [];
        }
      }
    });

    if (queries.length === 0) {
      return { updated: 0 };
    }

    const signal = getRequestSignal();
    const response = await runCosmo(
      certifyTicket(data.otp, data.ticket),
      signal,
    );

    // extract user-session cookie
    const session = response.cookies["user-session"];

    if (!session) {
      throw new Error("Error getting session");
    }

    type UpdateCandidate = {
      slug: string;
      artistName: string;
      class: string;
      value: string;
      prop: "frontMedia" | "bandImageUrl";
    };

    const candidates: UpdateCandidate[] = [];

    // fetch objekt summaries in parallel
    const summaries = await Promise.allSettled(
      queries.map(async (query) => {
        const result = await runCosmo(
          fetchObjektSummaries({
            session,
            artistId: query.artistId,
            className: query.class,
            seasons: query.seasons,
          }),
          signal,
        );

        return { query, summaries: result };
      }),
    );

    for (const result of summaries) {
      if (result.status === "rejected") continue;

      for (const item of result.value.summaries) {
        const value = item.collection[result.value.query.prop];

        // only operate on items that are missing and have a value
        if (value && missing.has(item.collection.collectionId)) {
          candidates.push({
            slug: slugifyObjekt(item.collection.collectionId),
            artistName: item.collection.artistName.toLowerCase(),
            class: result.value.query.class,
            value,
            prop: result.value.query.prop,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return { updated: 0 };
    }

    // process and upload media
    let updated = 0;
    for (const candidate of candidates) {
      let value = candidate.value;

      if (candidate.prop === "frontMedia") {
        value = await uploadCollectionMedia(
          candidate.value,
          candidate.artistName,
          candidate.slug,
          candidate.class,
        );
      }

      const updateResult = await indexer
        .update(collections)
        .set({ [candidate.prop]: value })
        .where(eq(collections.slug, candidate.slug))
        .returning({ slug: collections.slug });

      if (updateResult.length > 0) {
        updated++;
      }
    }

    return { updated };
  });

/**
 * Fetch the collections that need to be updated.
 */
export const $fetchScrapeCandidates = createServerFn({
  method: "GET",
}).handler(async (): Promise<ScrapeCandidate[]> => {
  const result = await indexer
    .select({
      collectionId: collections.collectionId,
      artist: collections.artist,
      class: collections.class,
      season: collections.season,
    })
    .from(collections)
    .where(
      or(
        // idntt bands
        and(
          eq(collections.artist, "idntt"),
          inArray(collections.class, ["Special", "Unit"]),
          isNull(collections.bandImageUrl),
        ),
        // motion videos
        and(eq(collections.class, "Motion"), isNull(collections.frontMedia)),
        // audio doubles
        and(
          eq(collections.class, "Double"),
          eq(collections.hasAudio, true),
          isNull(collections.frontMedia),
        ),
      ),
    );

  return result.map((c) => ({
    collectionId: c.collectionId,
    type:
      c.class === "Motion" ? "motion" : c.class === "Double" ? "audio" : "band",
    artist: c.artist,
    season: c.season,
  }));
});
