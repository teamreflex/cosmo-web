import { requireMarketAccess } from "@/hooks/use-has-permission";
import {
  marketNoticeQuery,
  rangeOffersNoticeQuery,
} from "@/lib/queries/market";
import { createFileRoute } from "@tanstack/react-router";

// every /market page is part of the trade system, so one gate covers them
export const Route = createFileRoute("/market")({
  beforeLoad: ({ context }) => requireMarketAccess(context.queryClient),
  /**
   * Read once per page load, so SSR renders the market notice open or closed,
   * and the listing composer reads whether to confirm a range without suspending.
   */
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({ ...marketNoticeQuery, staleTime: "static" }),
      context.queryClient.query({
        ...rangeOffersNoticeQuery,
        staleTime: "static",
      }),
    ]);
  },
});
