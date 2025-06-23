import { env } from "@/env";
import { ofetch } from "ofetch";

/**
 * Rescan an objekt's metadata.
 */
export async function rescanMetadata(tokenId: string) {
  try {
    await ofetch<{ message: string }>(
      `${env.INDEXER_PROXY_URL}/rescan-metadata/${tokenId}`,
      {
        method: "POST",
        headers: {
          "proxy-key": env.INDEXER_PROXY_KEY,
        },
      }
    );

    return true;
  } catch (e) {
    console.error("Failed to rescan metadata:", e);
    throw new Error("Failed to rescan metadata");
  }
}
