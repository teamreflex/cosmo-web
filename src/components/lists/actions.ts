"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { TypedActionResult } from "@/lib/server/typed-action/types";
import { ActionError } from "@/lib/server/typed-action/errors";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { Collection } from "@/lib/server/db/indexer/schema";
import { listEntries, lists, ObjektListEntry } from "@/lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getArtistsWithMembers } from "@/app/data-fetching";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

function createSlug(name: string) {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
 * Create a new objekt list.
 */
export const create = async (form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      name: z
        .string()
        .min(3, "Name must be at least 3 characters long")
        .max(24, "Name cannot be longer than 24 characters")
        .refine(
          (value) => /^[a-zA-Z0-9 ]+$/.test(value),
          "Name should only use alphanumeric characters"
        ),
    }),
    onValidate: async ({ data: { name }, user }) => {
      const slug = createSlug(name);

      // check if the slug is already taken
      const list = await fetchObjektList(user.address, slug);
      if (list !== undefined) {
        throw new ActionError({
          status: "error",
          validationErrors: {
            name: ["You already have a list with this name"],
          },
        });
      }

      // create the list
      const result = await db.insert(lists).values({
        name,
        slug,
        userAddress: user.address,
      });

      return result.rowCount === 1;
    },
  });

/**
 * Update an objekt list.
 */
export const update = async (prev: TypedActionResult<string>, form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      id: z.coerce.number(),
      name: z
        .string()
        .min(3, "Name must be at least 3 characters long")
        .max(24, "Name cannot be longer than 24 characters")
        .refine(
          (value) => /^[a-zA-Z0-9 ]+$/.test(value),
          "Name should only use alphanumeric characters"
        ),
    }),
    onValidate: async ({ data: { name, id }, user }) => {
      const slug = createSlug(name);

      // check if the slug is already taken
      const list = await db.query.lists.findFirst({
        where: {
          slug,
          userAddress: user.address,
          id: {
            NOT: id,
          },
        },
      });

      if (list !== undefined) {
        throw new ActionError({
          status: "error",
          validationErrors: {
            name: ["You already have a list with this name"],
          },
        });
      }

      // update list
      await db
        .update(lists)
        .set({ name, slug })
        .where(and(eq(lists.id, id), eq(lists.userAddress, user.address)))
        .returning();

      return `/@${user.nickname}/list/${slug}`;
    },
    redirectTo: ({ result }) => result,
  });

/**
 * Delete an objekt list.
 */
export const destroy = async (id: number) =>
  authenticatedAction({
    form: { id },
    schema: z.object({
      id: z.number(),
    }),
    onValidate: async ({ data: { id }, user }) => {
      const result = await db
        .delete(lists)
        .where(and(eq(lists.id, id), eq(lists.userAddress, user.address)));

      return result.rowCount === 1;
    },
    redirectTo: () => "/objekts",
  });

/**
 * Add an objekt to a list
 */
export const addObjektToList = async (form: {
  listId: number;
  collectionSlug: string;
}) =>
  authenticatedAction({
    form,
    schema: z.object({
      listId: z.number(),
      collectionSlug: z.string(),
    }),
    onValidate: async ({ data, user }) => {
      await assertUserOwnsList(data.listId, user.address);

      const result = await db.insert(listEntries).values({
        listId: data.listId,
        collectionId: data.collectionSlug,
      });

      return result.rowCount === 1;
    },
  });

/**
 * Remove an objekt from a list
 */
export const removeObjektFromList = async (form: {
  listId: number;
  entryId: number;
}) =>
  authenticatedAction({
    form,
    schema: z.object({
      listId: z.number(),
      entryId: z.number(),
    }),
    onValidate: async ({ data, user }) => {
      await assertUserOwnsList(data.listId, user.address);

      const result = await db
        .delete(listEntries)
        .where(
          and(
            eq(listEntries.listId, data.listId),
            eq(listEntries.id, data.entryId)
          )
        );

      return result.rowCount === 1;
    },
  });

/**
 * Generate a Discord have/want list.
 */
export const generateDiscordList = async (form: {
  have: string;
  want: string;
}) =>
  authenticatedAction({
    form,
    schema: z.object({
      have: z.string(),
      want: z.string(),
    }),
    onValidate: async ({ data, user }) => {
      // fetch lists and associated entries
      const lists = await db.query.lists.findMany({
        where: {
          userAddress: user.address,
          slug: {
            in: [data.have, data.want],
          },
        },
        with: {
          entries: true,
        },
      });

      const have = lists.find((l) => l.slug === data.have);
      const want = lists.find((l) => l.slug === data.want);

      if (!have || !want) {
        throw new ActionError({
          status: "error",
          error: "Please select both lists.",
        });
      }

      // fetch collections from the indexer
      const unique = new Set([
        ...have.entries.map((e) => e.collectionId),
        ...want.entries.map((e) => e.collectionId),
      ]);

      if (unique.size === 0) {
        throw new ActionError({
          status: "error",
          error: "Please select lists that are not empty",
        });
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
    },
  });

type CollectionSubset = Pick<
  Collection,
  "slug" | "member" | "season" | "collectionNo"
>;

/**
 * Formats a list of collections for a single member.
 */
function formatMemberCollections(collections: CollectionSubset[]): string {
  // extract unique season initial + collection number, sort, and join
  return [
    ...new Set(collections.map((c) => `${c.season.at(0)}${c.collectionNo}`)),
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
async function assertUserOwnsList(listId: number, userAddress: string) {
  const list = await db.query.lists.findFirst({
    where: {
      id: listId,
      userAddress,
    },
  });

  if (!list) {
    throw new ActionError({
      status: "error",
      error: "You do not have access to this list",
    });
  }
}
