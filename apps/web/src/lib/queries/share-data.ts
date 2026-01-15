import { indexer } from "@/lib/server/db/indexer";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { uploadCollectionMedia } from "@/lib/server/r2";
import { verifyCosmoSchema } from "@/lib/universal/schema/cosmo";
import { fetchObjektSummaries } from "@apollo/cosmo/server/collection";
import { certifyTicket } from "@apollo/cosmo/server/qr-auth";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { collections } from "@apollo/database/indexer/schema";
import { slugifyObjekt } from "@apollo/util";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

/**
 * Verify COSMO account, fetch collections, and submit media data.
 * Does everything in one server call to avoid CORS issues.
 */
export const $scrapeCollectionMedia = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(verifyCosmoSchema)
  .handler(async ({ data }) => {
    // safety check: if no collections need to be updated, return early
    const missing = await $fetchScrapeCandidates();
    if (missing.size === 0) {
      return { updated: 0 };
    }

    const response = await certifyTicket(data.otp, data.ticket);

    // extract user-session cookie
    const headers = response.headers.getSetCookie();
    let session: string | null = null;
    for (const header of headers) {
      const parts = header.split(";");
      for (const part of parts) {
        const [name, value] = part.trim().split("=");
        if (name === "user-session" && value !== undefined) {
          session = value;
          break;
        }
      }
    }

    if (!session) {
      throw new Error("Error getting session");
    }

    // create search queries
    const queries: {
      artistId: ValidArtist;
      class: string;
      prop: "frontMedia" | "bandImageUrl";
    }[] = [
      { artistId: "tripleS", class: "Motion", prop: "frontMedia" },
      { artistId: "artms", class: "Motion", prop: "frontMedia" },
      { artistId: "idntt", class: "Motion", prop: "frontMedia" },
      { artistId: "idntt", class: "Unit", prop: "bandImageUrl" },
    ];

    type UpdateCandidate = {
      slug: string;
      artistName: string;
      value: string;
      prop: "frontMedia" | "bandImageUrl";
    };

    const candidates: UpdateCandidate[] = [];

    // fetch objekt summaries in parallel
    const summaries = await Promise.allSettled(
      queries.map(async (query) => {
        const result = await fetchObjektSummaries({
          session,
          artistId: query.artistId,
          className: query.class,
        });

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
}).handler(async () => {
  const result = await indexer
    .select({
      collectionId: collections.collectionId,
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
      ),
    );

  return new Set(result.map((c) => c.collectionId));
});

export const scrapeCandidatesQuery = queryOptions({
  queryKey: ["scrape-candidates"],
  queryFn: () => $fetchScrapeCandidates(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
