import { queryOptions } from "@tanstack/react-query";
import { fetchPins } from "@/lib/server/objekts/pins";

export const pinsQuery = (username: string) =>
  queryOptions({
    queryKey: ["pins", username],
    queryFn: () => fetchPins({ data: { username } }),
  });
