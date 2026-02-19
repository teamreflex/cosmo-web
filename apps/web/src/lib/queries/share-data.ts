import { queryOptions } from "@tanstack/react-query";
import { $fetchScrapeCandidates } from "../functions/share-data";

export const scrapeCandidatesQuery = queryOptions({
  queryKey: ["scrape-candidates"],
  queryFn: () => $fetchScrapeCandidates(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
