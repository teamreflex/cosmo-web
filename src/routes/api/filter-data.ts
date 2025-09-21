import { createServerFileRoute } from "@tanstack/react-start/server";
import { fetchFilterData } from "@/queries";

export const ServerRoute = createServerFileRoute("/api/filter-data").methods({
  /**
   * Fetch the filter data.
   */
  GET: async () => {
    const data = await fetchFilterData();
    return Response.json(data);
  },
});
