import { indexer } from "@/lib/server/db/indexer";
import { adminMiddleware } from "@/lib/server/middlewares";
import { bandUrlRowSchema } from "@/lib/universal/schema/admin";
import { collections } from "@apollo/database/indexer/schema";
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";

/**
 * Update collections with band URLs.
 */
export const $saveBandUrls = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(bandUrlRowSchema.array())
  .handler(async ({ data }) => {
    if (data.length === 0) return true;

    const values = data
      .map((item) => sql`(${item.slug}, ${item.bandImageUrl})`)
      .reduce((acc, curr) => sql`${acc}, ${curr}`);

    await indexer.execute(sql`
        UPDATE ${collections}
        SET band_image_url = data.band_image_url
        FROM (VALUES ${values}) AS data(slug, band_image_url)
        WHERE ${collections.slug} = data.slug
      `);

    return true;
  });
