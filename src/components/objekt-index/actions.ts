"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import {
  createObjektList,
  deleteObjektList,
  updateObjektList,
} from "@/lib/server/objekts";
import { revalidatePath } from "next/cache";

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
      return await updateObjektList({ id, name, userAddress: user.address });
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
