import { $getCosmoKeyStatus } from "@/lib/functions/cache";
import { queryOptions } from "@tanstack/react-query";

export const cosmoKeyStatusQuery = queryOptions({
  queryKey: ["admin", "cosmo-key-status"],
  queryFn: ({ signal }) => $getCosmoKeyStatus({ signal }),
  staleTime: 0,
});
