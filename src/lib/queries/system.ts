import { queryOptions } from "@tanstack/react-query";
import { $fetchSystemStatus } from "@/lib/server/system";

export const systemStatusQuery = queryOptions({
  queryKey: ["system-status"],
  queryFn: $fetchSystemStatus,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
