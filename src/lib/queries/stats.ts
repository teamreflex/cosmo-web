import { queryOptions } from "@tanstack/react-query";
import { fetchObjektStats } from "@/lib/server/objekts/stats";

export const objektStatsQuery = queryOptions({
  queryKey: ["objekt-stats"],
  queryFn: fetchObjektStats,
});
