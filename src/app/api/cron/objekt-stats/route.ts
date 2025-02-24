import { env } from "@/env";
import { revalidateTag } from "next/cache";

/**
 * Flush the objekt stats cache.
 */
export function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("unauthorized", {
      status: 401,
    });
  }

  // flush the cache tag
  revalidateTag("objekt-stats");

  return new Response("ok");
}
