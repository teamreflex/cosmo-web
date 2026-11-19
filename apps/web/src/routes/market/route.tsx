import { dismissedNoticesQuery } from "@/lib/queries/market";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/market")({
  /**
   * Read once per page load, so SSR renders the market notice open or closed,
   * and the listing composer reads whether to confirm a range without suspending.
   */
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...dismissedNoticesQuery,
      staleTime: "static",
    });
  },
});
