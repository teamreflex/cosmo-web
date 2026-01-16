import { $fetchPins } from "@/lib/server/objekts/pins";
import { queryOptions } from "@tanstack/react-query";

export const pinsQuery = (username: string) =>
  queryOptions({
    queryKey: ["pins", username],
    queryFn: () => $fetchPins({ data: { username } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
