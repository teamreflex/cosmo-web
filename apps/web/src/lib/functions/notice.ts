import { redis } from "@/lib/server/cache.server";
import { adminMiddleware } from "@/lib/server/middlewares";
import { noticeSchema } from "@/lib/universal/schema/notice";
import { createServerFn } from "@tanstack/react-start";

const NOTICE_CACHE_KEY = "notice";

/**
 * Read the platform notice shown in the navbar. Public, returns null when unset.
 */
export const $getNotice = createServerFn({ method: "GET" }).handler(
  async () => {
    return await redis.get(NOTICE_CACHE_KEY);
  },
);

/**
 * Set or clear the platform notice in Redis. An empty message removes it.
 */
export const $setNotice = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(noticeSchema)
  .handler(async ({ data }) => {
    const message = data.message.trim();
    if (message.length === 0) {
      await redis.del(NOTICE_CACHE_KEY);
    } else {
      await redis.set(NOTICE_CACHE_KEY, message);
    }
  });
