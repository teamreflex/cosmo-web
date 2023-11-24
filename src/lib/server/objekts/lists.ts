import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listEntries, lists } from "../db/schema";
import {
  CreateObjektList,
  ObjektList,
  UpdateObjektList,
} from "@/lib/universal/objekt-index";

/**
 * Fetch all lists for a given user.
 */
export async function fetchObjektLists(address: string): Promise<ObjektList[]> {
  return await db.select().from(lists).where(eq(lists.userAddress, address));
}

/**
 * Fetch a single list.
 */
export async function fetchObjektList(
  slug: string
): Promise<ObjektList | undefined> {
  const rows = await db.select().from(lists).where(eq(lists.slug, slug));
  return rows[0];
}

/**
 * Fetch a single list with entries.
 */
export async function fetchObjektListWithEntries(slug: string) {
  const list = await db.query.lists.findFirst({
    where: eq(lists.slug, slug),
    with: {
      entries: true,
    },
  });

  if (!list) {
    return undefined;
  }

  return list;
}

/**
 * Create a new objekt list.
 */
export async function createObjektList(payload: CreateObjektList) {
  const row = await db.insert(lists).values(payload);
  return row.rowsAffected === 1;
}

/**
 * Update an objekt list.
 */
export async function updateObjektList(id: number, payload: UpdateObjektList) {
  const row = await db.update(lists).set(payload).where(eq(lists.id, id));
  return row.rowsAffected === 1;
}

/**
 * Delete an objekt list.
 */
export async function deleteObjektList(id: number, address: string) {
  // delete all entries first
  await db.delete(listEntries).where(eq(listEntries.listId, id));

  // then delete the list
  const row = await db
    .delete(lists)
    .where(and(eq(lists.id, id), eq(lists.userAddress, address)));
  return row.rowsAffected === 1;
}

/**
 * Add an objekt to a list.
 */
export async function addObjekt(listId: number, collectionId: string) {
  const row = await db.insert(listEntries).values({
    listId,
    collectionId,
  });
  return row.rowsAffected === 1;
}

/**
 * Remove an objekt from a list.
 */
export async function removeObjekt(listId: number, collectionId: string) {
  const row = await db
    .delete(listEntries)
    .where(
      and(
        eq(listEntries.listId, listId),
        eq(listEntries.collectionId, collectionId)
      )
    );
  return row.rowsAffected === 1;
}
