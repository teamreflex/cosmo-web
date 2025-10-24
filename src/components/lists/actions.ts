import { and, eq } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import {
  addObjektToListSchema,
  createObjektListSchema,
  deleteObjektListSchema,
  generateDiscordListSchema,
  removeObjektFromListSchema,
  updateObjektListSchema,
} from "../../lib/universal/schema/objekt-list";
import type { Collection } from "@/lib/server/db/indexer/schema";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import type { ObjektListEntry } from "@/lib/server/db/schema";
import { $fetchObjektList } from "@/lib/server/objekts/lists";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { objektListEntries, objektLists } from "@/lib/server/db/schema";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { $fetchArtists } from "@/lib/queries/core";

function createSlug(name: string) {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
 * Create a new objekt list.
 */
export const $createObjektList = createServerFn({ method: "POST" })
  .inputValidator(createObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const slug = createSlug(data.name);

    // check if the slug has already been used
    const list = await $fetchObjektList({
      data: {
        userId: context.session.session.userId,
        slug,
      },
    });
    if (list !== undefined) {
      throw new Error("You already have a list with this name");
    }

    // create the list
    const [result] = await db
      .insert(objektLists)
      .values({
        name: data.name,
        slug,
        userId: context.session.session.userId,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create list");
    }

    return result;
  });

/**
 * Update an objekt list.
 */
export const $updateObjektList = createServerFn({ method: "POST" })
  .inputValidator(updateObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const slug = createSlug(data.name);

    // check if the slug has already been used
    const list = await db.query.objektLists.findFirst({
      where: {
        slug,
        userId: context.session.session.userId,
        id: {
          NOT: data.id,
        },
      },
    });
    if (list !== undefined) {
      throw new Error("You already have a list with this name");
    }

    // update list
    const [result] = await db
      .update(objektLists)
      .set({ name: data.name, slug })
      .where(
        and(
          eq(objektLists.id, data.id),
          eq(objektLists.userId, context.session.session.userId),
        ),
      )
      .returning();

    if (!result) {
      throw new Error("Failed to update list");
    }

    // check if the user has a linked cosmo
    const cosmo = await db.query.cosmoAccounts.findFirst({
      where: {
        userId: context.session.session.userId,
      },
    });

    // redirect to their profile if they have a linked cosmo
    if (cosmo) {
      throw redirect({
        to: "/@{$username}/list/$slug",
        params: { username: cosmo.username, slug: result.slug },
      });
    }

    // otherwise redirect to the separate list page
    throw redirect({ to: `/list/$id`, params: { id: result.id } });
  });

/**
 * Delete an objekt list.
 */
export const $deleteObjektList = createServerFn({ method: "POST" })
  .inputValidator(deleteObjektListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .delete(objektLists)
      .where(
        and(
          eq(objektLists.id, data.id),
          eq(objektLists.userId, context.session.session.userId),
        ),
      );

    throw redirect({ to: "/" });
  });

/**
 * Add an objekt to a list
 */
export const $addObjektToList = createServerFn({ method: "POST" })
  .inputValidator(addObjektToListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    const result = await db.insert(objektListEntries).values({
      objektListId: data.objektListId,
      collectionId: data.collectionSlug,
    });

    return result.rowCount === 1;
  });

/**
 * Remove an objekt from a list
 */
export const $removeObjektFromList = createServerFn({ method: "POST" })
  .inputValidator(removeObjektFromListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await assertUserOwnsList(data.objektListId, context.session.session.userId);

    const result = await db
      .delete(objektListEntries)
      .where(
        and(
          eq(objektListEntries.objektListId, data.objektListId),
          eq(objektListEntries.id, data.objektListEntryId),
        ),
      );

    return result.rowCount === 1;
  });

/**
 * Generate a Discord have/want list.
 */
export const $generateDiscordList = createServerFn({ method: "POST" })
  .inputValidator(generateDiscordListSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // fetch lists and associated entries
    const lists = await db.query.objektLists.findMany({
      where: {
        id: {
          in: [data.haveId, data.wantId],
        },
        userId: context.session.session.userId,
      },
      with: {
        entries: true,
      },
    });

    const have = lists.find((l) => l.id === data.haveId);
    const want = lists.find((l) => l.id === data.wantId);

    if (!have || !want) {
      throw new Error("Please select both lists.");
    }

    // fetch collections from the indexer
    const unique = new Set([
      ...have.entries.map((e) => e.collectionId),
      ...want.entries.map((e) => e.collectionId),
    ]);

    if (unique.size === 0) {
      throw new Error("Please select lists that are not empty");
    }

    const collections = await indexer.query.collections.findMany({
      where: {
        slug: {
          in: Array.from(unique),
        },
      },
      columns: {
        slug: true,
        season: true,
        collectionNo: true,
        member: true,
        artist: true,
      },
    });

    // get artists for member ordering
    const artists = await $fetchArtists();

    // map into discord format
    const haveCollections = format(collections, have.entries, artists);
    const wantCollections = format(collections, want.entries, artists);

    const result = [
      "Have:",
      haveCollections.join("\n"),
      "",
      "Want:",
      wantCollections.join("\n"),
    ].join("\n");

    return result;
  });

type CollectionSubset = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo" | "artist"
>;

/**
 * Formats a list of collections for a single member.
 */
function formatMemberCollections(collections: CollectionSubset[]): string {
  // extract unique season initial + collection number, sort, and join
  return [
    ...new Set(
      collections.map((c) => {
        if (c.artist === "idntt") {
          return `${c.season} ${c.collectionNo}`;
        }

        const match = c.season.match(/([A-Za-z]+)(\d+)/);
        if (!match) return `${c.season.at(0)}${c.collectionNo}`;
        const [, seasonText, seasonNum] = match;
        const firstLetter = seasonText?.at(0) ?? "";
        const seasonPart = firstLetter.repeat(parseInt(seasonNum ?? "0", 10));
        return `${seasonPart}${c.collectionNo}`;
      }),
    ),
  ]
    .sort()
    .join(", ");
}

/**
 * Format a list of collections and entries into a string, grouped and sorted by member.
 */
function format(
  collections: CollectionSubset[],
  entries: ObjektListEntry[],
  artists: CosmoArtistWithMembersBFF[],
): string[] {
  // create a map for quick collection lookup by slug
  const collectionsMap = new Map(collections.map((c) => [c.slug, c]));

  // create member order map maintaining artist grouping for sorting
  const memberOrderMap: Record<string, number> = {};
  artists.forEach((artist, artistIndex) => {
    artist.artistMembers.forEach((member) => {
      // combine artist index and member order to ensure members of the same group stay together
      // and are ordered correctly within their group
      memberOrderMap[member.name] = (artistIndex + 1) * 1000 + member.order;
    });
  });

  // group collections by member
  const groupedCollectionsByMember = new Map<string, CollectionSubset[]>();
  for (const entry of entries) {
    const collection = collectionsMap.get(entry.collectionId);
    if (collection) {
      // get existing collections for the member or initialize an empty array
      const memberCollections =
        groupedCollectionsByMember.get(collection.member) ?? [];
      memberCollections.push(collection);
      // update the map
      groupedCollectionsByMember.set(collection.member, memberCollections);
    }
  }

  // sort members based on the order map
  return Array.from(groupedCollectionsByMember.entries())
    .sort(([memberA], [memberB]) => {
      // use max safe integer for members not found in the map (should only happen with special DCOs)
      const orderA = memberOrderMap[memberA] ?? Number.MAX_SAFE_INTEGER;
      const orderB = memberOrderMap[memberB] ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map(([member, memberCollections]) => {
      const formattedCollections = formatMemberCollections(memberCollections);
      return `${member} ${formattedCollections}`;
    });
}

/**
 * Assert the user owns the list.
 */
const assertUserOwnsList = createServerOnlyFn(
  async (id: string, userId: string) => {
    const count = await db.$count(
      objektLists,
      and(eq(objektLists.id, id), eq(objektLists.userId, userId)),
    );

    if (count === 0) {
      throw new Error("You do not have access to this list");
    }
  },
);
