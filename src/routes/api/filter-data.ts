import { createFileRoute } from "@tanstack/react-router";
import { fetchFilterData } from "@/queries";

export const Route = createFileRoute("/api/filter-data")({
  server: {
    handlers: {
      /**
       * Fetch the filter data.
       */
      GET: async () => {
        const data = await fetchFilterData();
        return Response.json(data);
      },
    },
  },
});
