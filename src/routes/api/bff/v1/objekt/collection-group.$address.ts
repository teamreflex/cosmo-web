import { createServerFileRoute } from "@tanstack/react-start/server";
import { parseUserCollectionGroups } from "@/lib/universal/parsers";
import { fetchObjektsBlockchainGroups } from "@/lib/server/objekts/prefetching/objekt-blockchain-groups";
import { Addresses, isEqual } from "@/lib/utils";

export const ServerRoute = createServerFileRoute(
  "/api/bff/v1/objekt/collection-group/$address"
).methods({
  /**
   * Fetch a user's collection groups from the indexer with given filters.
   */
  GET: async ({ params, request }) => {
    // prevent collection groups being used on the spin account
    if (isEqual(params.address, Addresses.SPIN)) {
      return Response.json({
        collectionCount: 0,
        collections: [],
      });
    }

    const url = new URL(request.url);
    const filters = parseUserCollectionGroups(url.searchParams);

    try {
      const response = await fetchObjektsBlockchainGroups(
        params.address,
        filters
      );
      return Response.json(response);
    } catch (error) {
      console.error("Error fetching collection groups:", error);
      return Response.json({
        collectionCount: 0,
        collections: [],
      });
    }
  },
});
