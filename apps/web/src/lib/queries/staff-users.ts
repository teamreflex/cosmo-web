import { $fetchRoleUser } from "@/lib/functions/staff-users";
import { queryOptions } from "@tanstack/react-query";

export const roleUserQuery = (address: string) =>
  queryOptions({
    queryKey: ["admin", "role-user", address],
    queryFn: ({ signal }) => $fetchRoleUser({ signal, data: { address } }),
  });
