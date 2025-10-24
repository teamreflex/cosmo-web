import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { adminMiddleware } from "../middlewares";

/**
 * Fetch the latest 10 metadata entries.
 */
export const $fetchLatestMetadata = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    return await db.query.objektMetadata.findMany({
      orderBy: {
        id: "desc",
      },
      limit: 10,
    });
  });
