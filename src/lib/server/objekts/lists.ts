import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listEntries, lists, ObjektList, profiles } from "../db/schema";
import { CreateObjektList, UpdateObjektList } from "@/lib/universal/objekts";

/**
 * Fetch all lists for a given user.
 */
export async function fetchObjektLists(nickname: string) {
  const result = await db.query.profiles.findFirst({
    where: eq(profiles.nickname, nickname),
    with: {
      lists: true,
    },
  });

  return result?.lists ?? [];
}

/**
 * Fetch a single list.
 */
export async function fetchObjektList(address: string, slug: string) {
  return await db.query.lists.findFirst({
    where: (lists, { and, eq }) =>
      and(eq(lists.slug, slug), eq(lists.userAddress, address)),
  });
}

/**
 * Create a new objekt list.
 */
export async function createObjektList(payload: CreateObjektList) {
  const rows = await db.insert(lists).values(payload).returning();
  return rows.length === 1;
}

/**
 * Update an objekt list.
 */
export async function updateObjektList(id: number, payload: UpdateObjektList) {
  const rows = await db
    .update(lists)
    .set(payload)
    .where(eq(lists.id, id))
    .returning();
  return rows.length === 1;
}

/**
 * Delete an objekt list.
 */
export async function deleteObjektList(id: number, address: string) {
  // delete all entries first
  await db.delete(listEntries).where(eq(listEntries.listId, id));

  // then delete the list
  const rows = await db
    .delete(lists)
    .where(and(eq(lists.id, id), eq(lists.userAddress, address)))
    .returning();

  return rows.length === 1;
}

/**
 * Add an objekt to a list.
 */
export async function addObjekt(listId: number, collectionSlug: string) {
  const rows = await db
    .insert(listEntries)
    .values({
      listId,
      collectionId: collectionSlug,
    })
    .returning();

  return rows.length === 1;
}

/**
 * Remove an objekt from a list.
 */
export async function removeObjekt(listId: number, collectionSlug: string) {
  const rows = await db
    .delete(listEntries)
    .where(
      and(
        eq(listEntries.listId, listId),
        eq(listEntries.collectionId, collectionSlug)
      )
    )
    .returning();

  return rows.length === 1;
}
