import "server-only";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ObjektMetadata } from "@/lib/universal/cosmo/objekts";

/**
 * Fetch token metadata from Cosmo.
 */
export async function fetchObjekt(tokenId: string) {
  const res = await fetch(`${COSMO_ENDPOINT}/objekt/v1/token/${tokenId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch token "${tokenId}"`);
  }

  const result: ObjektMetadata = await res.json();
  return result;
}
