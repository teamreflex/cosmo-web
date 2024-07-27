"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import {
  addObjekt,
  createObjektList,
  deleteObjektList,
  fetchObjektList,
  removeObjekt,
  updateObjektList,
} from "@/lib/server/objekts/lists";
import slugify from "slugify";
import { TypedActionResult } from "@/lib/server/typed-action/types";
import { ActionError } from "@/lib/server/typed-action/errors";
import { db } from "@/lib/server/db";

function createSlug(name: string) {
  return slugify(name, { lower: true });
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

      return await createObjektList({
        name,
        slug,
        userAddress: user.address,
      });
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

      await updateObjektList(id, {
        name,
        slug,
        userAddress: user.address,
      });

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
      return await deleteObjektList(id, user.address);
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
    onValidate: async ({ data }) => {
      return await addObjekt(data.listId, data.collectionSlug);
    },
  });

/**
 * Remove an objekt from a list
 */
export const removeObjektFromList = async (form: {
  listId: number;
  collectionSlug: string;
}) =>
  authenticatedAction({
    form,
    schema: z.object({
      listId: z.number(),
      collectionSlug: z.string(),
    }),
    onValidate: async ({ data }) => {
      return await removeObjekt(data.listId, data.collectionSlug);
    },
  });
