import { $fetchSystemStatus } from "@/lib/functions/system";
import { queryOptions } from "@tanstack/react-query";

export const systemStatusQuery = queryOptions({
  queryKey: ["system-status"],
  queryFn: ({ signal }) => $fetchSystemStatus({ signal }),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
