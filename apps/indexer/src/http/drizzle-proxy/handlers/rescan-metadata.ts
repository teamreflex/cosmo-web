import { Context } from "hono";
import { writePool } from "../db";
import { fetchMetadata } from "../../../cosmo";

export async function rescanMetadata(c: Context) {
  const client = await writePool.connect();

  const tokenId = c.req.param("tokenId");

  // input validation
  if (!tokenId || typeof tokenId !== "string" || tokenId.trim() === "") {
    return c.json({ error: "Invalid token ID" }, 400);
  }

  try {
    // start transaction
    await client.query("BEGIN");

    // fetch existing objekt row
    const result = await client.query<ObjektRow>(
      "select id, serial, collection_id from objekt where id = $1",
      [tokenId]
    );

    // token id doesn't exist
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return c.json({ error: "Objekt not found" }, 404);
    }

    const objekt = result.rows[0];

    try {
      // fetch metadata from cosmo
      const metadata = await fetchMetadata(objekt.id);

      // update objekt table
      await client.query(
        "update objekt set transferable = $1, serial = $2 where id = $3",
        [metadata.objekt.transferable, metadata.objekt.objektNo, objekt.id]
      );

      // update collection table
      await client.query(
        "update collection set thumbnail_image = $1, front_image = $2, back_image = $3, background_color = $4, text_color = $5 where id = $6",
        [
          metadata.objekt.thumbnailImage,
          metadata.objekt.frontImage,
          metadata.objekt.backImage,
          metadata.objekt.backgroundColor,
          metadata.objekt.textColor,
          objekt.collection_id,
        ]
      );

      // commit transaction
      await client.query("COMMIT");
      return c.json({ message: "Metadata updated" }, 200);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Failed to fetch metadata:", e);
      return c.json({ error: "Failed to fetch metadata" }, 500);
    }
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Database error:", e);
    return c.json({ error: "Database error" }, 500);
  } finally {
    client.release(); // always release the connection back to the pool
  }
}

type ObjektRow = {
  id: string;
  serial: number;
  collection_id: string;
};
