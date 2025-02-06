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
        where: (lists, { and, eq, not }) =>
          and(
            eq(lists.slug, slug),
            eq(lists.userAddress, user.address),
            not(eq(lists.id, id))
          ),
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
        where: (table, { and, inArray, eq }) =>
          and(
            eq(table.userAddress, user.address),
            inArray(table.slug, [data.have, data.want])
          ),
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
        where: (table, { inArray }) => inArray(table.slug, Array.from(unique)),
        columns: {
          slug: true,
          season: true,
          collectionNo: true,
          member: true,
        },
      });

      // map into discord format
      const haveCollections = format(collections, have.entries);
      const wantCollections = format(collections, want.entries);

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
 * Format a list of collections and entries into a string.
 */
function format(collections: CollectionSubset[], entries: ObjektListEntry[]) {
  const mappedEntries = entries
    .map((e) => collections.find((c) => c.slug === e.collectionId))
    .filter((e) => e !== undefined);

  // group entries by member
  const groupedCollections = mappedEntries.reduce((acc, entry) => {
    if (!acc[entry.member]) {
      acc[entry.member] = [];
    }
    acc[entry.member].push(entry);
    return acc;
  }, {} as Record<string, CollectionSubset[]>);

  // sort members alphabetically
  const sortedMembers = Object.keys(groupedCollections).sort();

  // format each member's entry
  return sortedMembers.map((member) => {
    const memberCollections = groupedCollections[member];
    const formattedCollections = [
      ...new Set(
        memberCollections.map((c) => `${c.season.at(0)}${c.collectionNo}`)
      ),
    ]
      .sort()
      .join(", ");
    return `${member} ${formattedCollections}`;
  });
}

/**
 * Assert the user owns the list.
 */
async function assertUserOwnsList(listId: number, userAddress: string) {
  const list = await db.query.lists.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, listId), eq(table.userAddress, userAddress)),
  });

  if (!list) {
    throw new ActionError({
      status: "error",
      error: "You do not have access to this list",
    });
  }
}
