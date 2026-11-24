import { Error } from "@/components/error-boundary";
import MyTrades from "@/components/trades/my-trades";
import MyTradesHeader from "@/components/trades/my-trades-header";
import MyTradesSkeleton from "@/components/trades/my-trades-skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { myListingsQuery } from "@/lib/queries/trade-listings";
import { myTradesQuery } from "@/lib/queries/trades";
import { myTradesPageTabs } from "@/lib/universal/trades";
import { noop } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

export const Route = createFileRoute("/market/trades")({
  validateSearch: z.object({
    tab: z.enum(myTradesPageTabs).default("active").catch("active"),
  }),
  beforeLoad: async ({ context }) => {
    const account = await context.queryClient.query({
      ...currentAccountQuery,
      staleTime: "static",
    });
    if (!account) {
      throw redirect({ to: "/" });
    }
  },
  loaderDeps: ({ search: { tab } }) => ({ tab }),
  // streamed, so the header shows at once and the tab's skeleton holds its place
  loader: ({ context, deps }) => {
    const rows =
      deps.tab === "listings"
        ? context.queryClient.infiniteQuery(myListingsQuery())
        : context.queryClient.infiniteQuery(myTradesQuery(deps.tab));
    void rows.catch(noop);
  },
  head: () =>
    defineHead({
      title: m.my_trades_title(),
      canonical: "/market/trades",
      denyRobots: true,
    }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();

  return (
    <main className="flex flex-col">
      <MyTrades tab={tab} />
    </main>
  );
}

function PendingComponent() {
  const { tab } = Route.useSearch();

  return (
    <main className="flex flex-col">
      <MyTradesHeader tab={tab} />
      <div className="container py-4">
        <MyTradesSkeleton tab={tab} />
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.my_trades_error()} />;
}
