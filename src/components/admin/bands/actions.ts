"use server";

import { env } from "@/env";
import { adminActionClient } from "@/lib/server/middlewares";
import { bandUrlRowSchema } from "@/lib/universal/schema/admin";
import { ofetch } from "ofetch";

/**
 * Update collections with band URLs.
 */
export const saveBandUrls = adminActionClient
  .metadata({ actionName: "saveBandUrls" })
  .inputSchema(bandUrlRowSchema.array())
  .action(async ({ parsedInput }) => {
    await ofetch<{ message: string }>(`${env.INDEXER_PROXY_URL}/set-band`, {
      method: "POST",
      headers: {
        "proxy-key": env.INDEXER_PROXY_KEY,
      },
      body: {
        items: parsedInput,
      },
    });

    return true;
  });
