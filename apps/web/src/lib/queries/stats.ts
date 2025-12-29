import { $fetchObjektStats } from "@/lib/server/objekts/stats";
import { queryOptions } from "@tanstack/react-query";

export const objektStatsQuery = queryOptions({
  queryKey: ["objekt-stats"],
  queryFn: ({ signal }) => $fetchObjektStats({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
