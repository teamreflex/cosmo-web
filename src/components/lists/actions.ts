"use server";

import "server-only";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  objektLists,
  objektListEntries,
  type ObjektListEntry,
} from "@/lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getArtistsWithMembers } from "@/app/data-fetching";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ActionError, authActionClient } from "@/lib/server/server-actions";
import { returnValidationErrors } from "next-safe-action";
import {
  addObjektToListSchema,
  createObjektListSchema,
  deleteObjektListSchema,
  generateDiscordListSchema,
  removeObjektFromListSchema,
  updateObjektListSchema,
} from "../../lib/universal/schema/objekt-list";
import { redirect } from "next/navigation";

function createSlug(name: string) {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
 * Create a new objekt list.
 */
export const createObjektList = authActionClient
  .metadata({ actionName: "createObjektList" })
  .inputSchema(createObjektListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const slug = createSlug(parsedInput.name);

    // check if the slug has already been used
    const list = await fetchObjektList({
      userId: ctx.session.session.userId,
      slug,
    });
    if (list !== undefined) {
      returnValidationErrors(createObjektListSchema, {
        name: {
          _errors: ["You already have a list with this name"],
        },
      });
    }

    // create the list
    const [result] = await db
      .insert(objektLists)
      .values({
        name: parsedInput.name,
        slug,
        userId: ctx.session.session.userId,
      })
      .returning();

    return result;
  });

/**
 * Update an objekt list.
 */
export const updateObjektList = authActionClient
  .metadata({ actionName: "updateObjektList" })
  .inputSchema(updateObjektListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const slug = createSlug(parsedInput.name);

    // check if the slug has already been used
    const list = await db.query.objektLists.findFirst({
      where: {
        slug,
        userId: ctx.session.session.userId,
        id: {
          NOT: parsedInput.id,
        },
      },
    });
    if (list !== undefined) {
      returnValidationErrors(createObjektListSchema, {
        name: {
          _errors: ["You already have a list with this name"],
        },
      });
    }

    // update list
    const [result] = await db
      .update(objektLists)
      .set({ name: parsedInput.name, slug })
      .where(
        and(
          eq(objektLists.id, parsedInput.id),
          eq(objektLists.userId, ctx.session.session.userId)
        )
      )
      .returning();

    // check if the user has a linked cosmo
    const cosmo = await db.query.cosmoAccounts.findFirst({
      where: {
        userId: ctx.session.session.userId,
      },
    });

    // redirect to their profile if they have a linked cosmo
    if (cosmo) {
      redirect(`/@${cosmo.username}/list/${result.slug}`);
    }

    // otherwise redirect to the separate list page
    redirect(`/list/${result.id}`);
  });

/**
 * Delete an objekt list.
 */
export const deleteObjektList = authActionClient
  .metadata({ actionName: "deleteObjektList" })
  .inputSchema(deleteObjektListSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db
      .delete(objektLists)
      .where(
        and(
          eq(objektLists.id, parsedInput.id),
          eq(objektLists.userId, ctx.session.session.userId)
        )
      );

    redirect("/");
  });

/**
 * Add an objekt to a list
 */
export const addObjektToList = authActionClient
  .metadata({ actionName: "addObjektToList" })
  .inputSchema(addObjektToListSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertUserOwnsList(
      parsedInput.objektListId,
      ctx.session.session.userId
    );

    const result = await db.insert(objektListEntries).values({
      objektListId: parsedInput.objektListId,
      collectionId: parsedInput.collectionSlug,
    });

    return result.rowCount === 1;
  });

/**
 * Remove an objekt from a list
 */
export const removeObjektFromList = authActionClient
  .metadata({ actionName: "removeObjektFromList" })
  .inputSchema(removeObjektFromListSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertUserOwnsList(
      parsedInput.objektListId,
      ctx.session.session.userId
    );

    const result = await db
      .delete(objektListEntries)
      .where(
        and(
          eq(objektListEntries.objektListId, parsedInput.objektListId),
          eq(objektListEntries.id, parsedInput.objektListEntryId)
        )
      );

    return result.rowCount === 1;
  });

/**
 * Generate a Discord have/want list.
 */
export const generateDiscordList = authActionClient
  .metadata({ actionName: "generateDiscordList" })
  .inputSchema(generateDiscordListSchema)
  .action(async ({ parsedInput, ctx }) => {
    // fetch lists and associated entries
    const lists = await db.query.objektLists.findMany({
      where: {
        id: {
          in: [parsedInput.haveId, parsedInput.wantId],
        },
        userId: ctx.session.session.userId,
      },
      with: {
        entries: true,
      },
    });

    const have = lists.find((l) => l.id === parsedInput.haveId);
    const want = lists.find((l) => l.id === parsedInput.wantId);

    if (!have || !want) {
      throw new ActionError("Please select both lists.");
    }

    // fetch collections from the indexer
    const unique = new Set([
      ...have.entries.map((e) => e.collectionId),
      ...want.entries.map((e) => e.collectionId),
    ]);

    if (unique.size === 0) {
      throw new ActionError("Please select lists that are not empty");
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
    const artists = getArtistsWithMembers();

    // map into discord format
    const haveCollections = format(collections, have.entries, artists);
    const wantCollections = format(collections, want.entries, artists);

    return [
      "Have:",
      haveCollections.join("\n"),
      "",
      "Want:",
      wantCollections.join("\n"),
    ].join("\n");
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
        const firstLetter = seasonText.at(0) || "";
        const seasonPart = firstLetter.repeat(parseInt(seasonNum, 10));
        return `${seasonPart}${c.collectionNo}`;
      })
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
  artists: CosmoArtistWithMembersBFF[]
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
async function assertUserOwnsList(id: string, userId: string) {
  const list = await db.query.objektLists.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!list) {
    throw new ActionError("You do not have access to this list");
  }
}
