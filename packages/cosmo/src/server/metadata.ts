import { ofetch } from "ofetch";
import type {
  CosmoObjektMetadataV1,
  CosmoObjektMetadataV3,
} from "../types/metadata";

/**
 * Fetch objekt metadata from the v1 API.
 */
export async function fetchMetadataV1(tokenId: string) {
  return await ofetch<CosmoObjektMetadataV1>(
    `https://api.cosmo.fans/objekt/v1/token/${tokenId}`,
    {
      retry: 4,
      retryDelay: 750, // 750ms backoff
    },
  );
}

/**
 * Fetch objekt metadata from the v3 API.
 * Shouldn't be used as it doesn't contain full collection data.
 */
export async function fetchMetadataV3(tokenId: string) {
  return await ofetch<CosmoObjektMetadataV3>(
    `https://api.cosmo.fans/bff/v3/objekts/nft-metadata/${tokenId}`,
    { retry: 2, retryDelay: 500 }, // 500ms backoff
  );
}
