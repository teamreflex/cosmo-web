import { ofetch } from "ofetch";
import type {
  CosmoObjektMetadataV1,
  CosmoObjektMetadataV3,
} from "../types/metadata.js";

/**
 * Fetch objekt metadata from the v1 API.
 */
export async function fetchMetadataV1(tokenId: string, signal?: AbortSignal) {
  return await ofetch<CosmoObjektMetadataV1>(
    `https://api.cosmo.fans/objekt/v1/token/${tokenId}`,
    { signal },
  );
}

/**
 * Fetch objekt metadata from the v3 API.
 * Shouldn't be used as it doesn't contain full collection data.
 */
export async function fetchMetadataV3(tokenId: string, signal?: AbortSignal) {
  return await ofetch<CosmoObjektMetadataV3>(
    `https://api.cosmo.fans/bff/v3/objekts/nft-metadata/${tokenId}`,
    { signal },
  );
}
