import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/server/middlewares";
import { bandUrlRowSchema } from "@/lib/universal/schema/admin";

/**
 * Update collections with band URLs.
 */
export const $saveBandUrls = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(bandUrlRowSchema.array())
  .handler(() => {
    // TODO: re-implement this
    // await ofetch<{ message: string }>(`${env.INDEXER_PROXY_URL}/set-band`, {
    //   method: "POST",
    //   headers: {
    //     "proxy-key": env.INDEXER_PROXY_KEY,
    //   },
    //   body: {
    //     items: data,
    //   },
    // });

    return true;
  });
