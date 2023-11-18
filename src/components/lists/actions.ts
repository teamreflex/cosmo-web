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
} from "@/lib/server/objekts";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

function createSlug(name: string) {
  return slugify(name, {
    lower: true,
    strict: true,
  });
}

/**
 * Create a new objekt list.
 */
export const create = async (form: { name: string }) =>
  authenticatedAction(
    z.object({
      name: z.string().max(24),
    }),
    form,
    async ({ name }, user) => {
      const result = await createObjektList({
        name,
        slug: createSlug(name),
        userAddress: user.address,
      });
      revalidatePath("/objekts");
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
      name: z.string().max(24),
    }),
    form,
    async ({ id, name }, user) => {
      return await updateObjektList({
        id,
        name,
        slug: createSlug(name),
        userAddress: user.address,
      });
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
      return await deleteObjektList(id, user.address);
    }
  );

/**
 * Add an objekt to a list
 */
export const addObjektToList = async (form: {
  listId: number;
  objektId: number;
}) =>
  authenticatedAction(
    z.object({
      listId: z.number(),
      objektId: z.number(),
    }),
    form,
    async ({ listId, objektId }, user) => {
      return await addObjekt(listId, objektId);
    }
  );

/**
 * Remove an objekt from a list
 */
export const removeObjektFromList = async (form: {
  listId: number;
  objektId: number;
}) =>
  authenticatedAction(
    z.object({
      listId: z.number(),
      objektId: z.number(),
    }),
    form,
    async ({ listId, objektId }, user) => {
      return await removeObjekt(listId, objektId);
    }
  );
