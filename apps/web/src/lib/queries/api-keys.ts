import { $listApiKeys, $searchUsers } from "@/lib/functions/api-keys";
import { queryOptions } from "@tanstack/react-query";

export const apiKeysQuery = queryOptions({
  queryKey: ["admin", "api-keys"],
  queryFn: ({ signal }) => $listApiKeys({ signal }),
});

export const searchUsersQuery = (query: string) =>
  queryOptions({
    queryKey: ["admin", "user-search", query],
    queryFn: ({ signal }) => $searchUsers({ signal, data: { query } }),
  });
