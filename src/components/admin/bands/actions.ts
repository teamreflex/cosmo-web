import { ofetch } from "ofetch";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/server/middlewares";
import { bandUrlRowSchema } from "@/lib/universal/schema/admin";
import { env } from "@/lib/env/server";

/**
 * Update collections with band URLs.
 */
export const $saveBandUrls = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(bandUrlRowSchema.array())
  .handler(async ({ data }) => {
    await ofetch<{ message: string }>(`${env.INDEXER_PROXY_URL}/set-band`, {
      method: "POST",
      headers: {
        "proxy-key": env.INDEXER_PROXY_KEY,
      },
      body: {
        items: data,
      },
    });

    return true;
  });
