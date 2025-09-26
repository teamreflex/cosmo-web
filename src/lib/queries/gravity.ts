import { queryOptions } from "@tanstack/react-query";
import { fetchGravities } from "../server/gravity";

export const gravitiesIndexQuery = queryOptions({
  queryKey: ["gravities"],
  queryFn: fetchGravities,
});
