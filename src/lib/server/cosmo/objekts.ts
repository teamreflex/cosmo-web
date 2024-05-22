import { cosmoSchema } from "@/lib/universal/parsers";
import { z } from "zod";
import { cosmo } from "../http";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";

type FetchObjektsForAddress = {
  filters: z.infer<typeof cosmoSchema>;
  address: string;
};

/**
 * Fetch objekts from Cosmo for a given address.
 */
export async function fetchObjektsForAddress({
  filters,
  address,
}: FetchObjektsForAddress) {
  return await cosmo<OwnedObjektsResult>(
    `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}`,
    {
      query: filters,
      cache: "no-cache",
    }
  );
}
