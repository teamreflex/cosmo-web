import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { lists } from "../db/schema";
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
export async function fetchObjektList(slug: string): Promise<ObjektList> {
  const rows = await db.select().from(lists).where(eq(lists.slug, slug));
  if (rows.length === 0) {
    throw new Error(`ObjektList "${slug}" not found`);
  }
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
export async function updateObjektList(payload: UpdateObjektList) {
  const row = await db.update(lists).set(payload);
  return row.rowsAffected === 1;
}

/**
 * Delete an objekt list.
 */
export async function deleteObjektList(id: number, address: string) {
  const row = await db
    .delete(lists)
    .where(and(eq(lists.id, id), eq(lists.userAddress, address)));
  return row.rowsAffected === 1;
}
