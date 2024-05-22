"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import {
  addObjekt,
  createObjektList,
  deleteObjektList,
  removeObjekt,
  updateObjektList,
} from "@/lib/server/objekts/lists";
import { revalidateTag } from "next/cache";
import slugify from "slugify";
import { TypedActionResult } from "@/lib/server/typed-action/types";

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
      const result = await createObjektList({
        name,
        slug: createSlug(name),
        userAddress: user.address,
      });
      revalidateTag(`objekt-lists:${user.address}`);
      return result;
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
      await updateObjektList(id, {
        name,
        slug,
        userAddress: user.address,
      });

      revalidateTag(`objekt-lists:${user.address}`);

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
      const result = await deleteObjektList(id, user.address);
      revalidateTag(`objekt-lists:${user.address}`);
      return result;
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
