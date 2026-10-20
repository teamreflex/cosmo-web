import { requireMarketAccess } from "@/hooks/use-has-permission";
import { marketNoticeQuery } from "@/lib/queries/market";
import { createFileRoute } from "@tanstack/react-router";

// every /market page is part of the trade system, so one gate covers them
export const Route = createFileRoute("/market")({
  beforeLoad: ({ context }) => requireMarketAccess(context.queryClient),
  // read once per page load, so SSR renders the market notice open or closed
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...marketNoticeQuery,
      staleTime: "static",
    });
  },
});
