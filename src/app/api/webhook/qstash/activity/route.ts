import { db } from "@/lib/server/db";
import { objekts } from "@/lib/server/db/schema";
import { verifyMessage } from "@/lib/server/qstash";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(request: Request) {
  const signature = request.headers.get("Upstash-Signature");
  const body = await request.text();
  if ((await verifyMessage(signature, body)) === false) {
    console.log("[qstash-activity] invalid signature");
    return Response.json({ status: "error" }, { status: 422 });
  }

  const objekt = JSON.parse(body) as IncomingObjekt;
  // check the database first
  console.log(`[qstash-activity] checking database: ${objekt.collectionId}`);
  if ((await shouldSaveObjekt(objekt.collectionId)) === false) {
    return Response.json({ status: "ok" });
  }

  // save new objekt if it's not in the db already
  console.log(`[qstash-activity] inserting new objekt: ${objekt.collectionId}`);
  const result = await db.insert(objekts).values({
    ...objekt,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  if (result.rowsAffected !== 1) {
    return Response.json({ status: "error" }, { status: 500 });
  }

  return Response.json({ status: "ok" });
}

/**
 * Check the database for the collection ID.
 * @param collectionId string
 */
async function shouldSaveObjekt(collectionId: string) {
  const rows = await db
    .select({ collectionId: objekts.collectionId })
    .from(objekts)
    .where(eq(objekts.collectionId, collectionId));
  return rows.length === 0;
}

type IncomingObjekt = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ("artms" | "tripleS")[];
  frontImage: string;
  backImage: string;
  backgroundColor: string;
  textColor: string;
  on_offline: "online" | "offline";
};
