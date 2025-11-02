import { Context } from "hono";
import { writePool } from "../db";
import z from "zod";

const schema = z.object({
  items: z
    .object({
      slug: z.string().min(1),
      bandImageUrl: z.string().min(1),
    })
    .array(),
});

export async function setBand(c: Context) {
  const client = await writePool.connect();

  try {
    const body = await c.req.json();
    var { items } = schema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return c.json(
        { error: e.errors.map((error) => error.message).join(", ") },
        422
      );
    }

    return c.json({ error: "Invalid request body" }, 422);
  }

  // early return if no items to update
  if (items.length === 0) {
    return c.json({ message: "No items to update" }, 200);
  }

  try {
    // make placeholders for the query
    const updateValues = items
      .map((item, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
      .join(", ");

    // make params for the query (bandImageUrl, slug) for each item
    const params = items.flatMap((item) => [item.bandImageUrl, item.slug]);

    // update collection table
    await client.query(
      `UPDATE collection 
       SET band_image_url = updates.band_image_url 
       FROM (VALUES ${updateValues}) AS updates(band_image_url, slug) 
       WHERE collection.slug = updates.slug`,
      params
    );

    return c.json({ message: "Band image url(s) updated" }, 200);
  } catch (e) {
    console.error("Database error:", e);
    return c.json({ error: "Database error" }, 500);
  } finally {
    client.release(); // always release the connection back to the pool
  }
}
