import { $fetchObjektsIndex } from "@/lib/server/objekts/prefetching/objekt-index";
import { objektIndexBackendSchema } from "@/lib/universal/parsers";
import { parseSearchParams } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const searchParams = parseSearchParams(url.searchParams);
        const parsed = objektIndexBackendSchema.safeParse(searchParams);
        if (!parsed.success) {
          return Response.json({
            total: 0,
            hasNext: false,
            nextStartAfter: undefined,
            objekts: [],
          });
        }

        const result = await $fetchObjektsIndex({
          data: parsed.data,
        });

        return Response.json(result);
      },
    },
  },
});
