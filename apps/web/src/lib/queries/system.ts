import { $fetchSystemStatus } from "@/lib/functions/system";
import { queryOptions } from "@tanstack/react-query";

/**
 * Refetched every two minutes, so a page left open keeps a current status.
 */
export const systemStatusQuery = queryOptions({
  queryKey: ["system-status"],
  queryFn: ({ signal }) => $fetchSystemStatus({ signal }),
  staleTime: 2 * 60 * 1000,
  refetchInterval: 2 * 60 * 1000,
});
