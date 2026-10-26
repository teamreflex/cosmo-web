import {
  $fetchFeedbackEntries,
  $fetchFeedbackSummary,
} from "@/lib/functions/feedback";
import type { FeedbackSearch } from "@/lib/universal/feedback";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

/**
 * Every query of one address's feedback page, which a removal invalidates.
 * Nothing in them depends on who is signed in.
 */
export const feedbackKey = (address: string) =>
  ["feedback", address.toLowerCase()] as const;

export const feedbackSummaryQuery = (address: string) =>
  queryOptions({
    queryKey: [...feedbackKey(address), "summary"],
    queryFn: ({ signal }) =>
      $fetchFeedbackSummary({ signal, data: { address } }),
  });

export const feedbackEntriesQuery = (address: string, search: FeedbackSearch) =>
  infiniteQueryOptions({
    queryKey: [...feedbackKey(address), "entries", search],
    queryFn: ({ signal, pageParam }) =>
      $fetchFeedbackEntries({
        signal,
        data: { address, ...search, cursor: pageParam },
      }),
    initialPageParam: firstPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/**
 * The first page has no cursor. Typed as the cursor union so the query
 * infers its page param from it.
 */
const firstPage: string | undefined = undefined;
