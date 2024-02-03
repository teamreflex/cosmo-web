"use server";

import "server-only";
import * as z from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import {
  addObjekt,
  createObjektList,
  deleteObjektList,
  removeObjekt,
  updateObjektList,
} from "@/lib/server/objekts/lists";
import { revalidatePath, revalidateTag } from "next/cache";
import slugify from "slugify";

function createSlug(name: string) {
  return slugify(name, { lower: true });
}

/**
 * Create a new objekt list.
 */
export const create = async (form: { name: string }) =>
  authenticatedAction(
    z.object({
      name: z
        .string()
        .min(3, "Name must be at least 3 characters long")
        .max(24, "Name cannot be longer than 24 characters")
        .refine(
          (value) => /^[a-zA-Z0-9 ]+$/.test(value),
          "Name should only use alphanumeric characters"
        ),
    }),
    form,
    async ({ name }, user) => {
      const result = await createObjektList({
        name,
        slug: createSlug(name),
        userAddress: user.address,
      });
      revalidateTag(`objekt-lists:${user.address}`);
      return result;
    }
  );

/**
 * Update an objekt list.
 */
export const update = async (form: { id: number; name: string }) =>
  authenticatedAction(
    z.object({
      id: z.number(),
      name: z
        .string()
        .min(3, "Name must be at least 3 characters long")
        .max(24, "Name cannot be longer than 24 characters")
        .refine(
          (value) => /^[a-zA-Z0-9 ]+$/.test(value),
          "Name should only use alphanumeric characters"
        ),
    }),
    form,
    async ({ id, name }, user) => {
      const slug = createSlug(name);
      const success = await updateObjektList(id, {
        name,
        slug,
        userAddress: user.address,
      });

      revalidateTag(`objekt-lists:${user.address}`);

      if (success) {
        return `/@${user.nickname}/list/${slug}`;
      } else {
        return undefined;
      }
    }
  );

/**
 * Delete an objekt list.
 */
export const destroy = async (form: { id: number }) =>
  authenticatedAction(
    z.object({
      id: z.number(),
    }),
    form,
    async ({ id }, user) => {
      const result = await deleteObjektList(id, user.address);
      if (result) {
        revalidateTag(`objekt-lists:${user.address}`);
        return result;
      }
    }
  );

/**
 * Add an objekt to a list
 */
export const addObjektToList = async (form: {
  listId: number;
  collectionSlug: string;
}) =>
  authenticatedAction(
    z.object({
      listId: z.number(),
      collectionSlug: z.string(),
    }),
    form,
    async ({ listId, collectionSlug }, user) => {
      return await addObjekt(listId, collectionSlug);
    }
  );

/**
 * Remove an objekt from a list
 */
export const removeObjektFromList = async (form: {
  listId: number;
  collectionSlug: string;
}) =>
  authenticatedAction(
    z.object({
      listId: z.number(),
      collectionSlug: z.string(),
    }),
    form,
    async ({ listId, collectionSlug }, user) => {
      return await removeObjekt(listId, collectionSlug);
    }
  );
