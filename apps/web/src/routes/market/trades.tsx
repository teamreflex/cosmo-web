import { Error } from "@/components/error-boundary";
import MyTrades, { MyTradesSkeleton } from "@/components/trades/my-trades";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { myTradesQuery } from "@/lib/queries/trades";
import { myTradesTabs } from "@/lib/universal/trades";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

export const Route = createFileRoute("/market/trades")({
  validateSearch: z.object({
    tab: z.enum(myTradesTabs).default("active").catch("active"),
  }),
  beforeLoad: async ({ context }) => {
    const account =
      await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!account) {
      throw redirect({ to: "/" });
    }
  },
  loaderDeps: ({ search: { tab } }) => ({ tab }),
  // the live trades give the counts on either tab
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myTradesQuery("active")),
      context.queryClient.ensureQueryData(myTradesQuery(deps.tab)),
    ]);
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
  const { data: active } = useSuspenseQuery(myTradesQuery("active"));
  const { data: rows } = useSuspenseQuery(myTradesQuery(tab));

  return (
    <main className="flex flex-col">
      <MyTrades tab={tab} active={active} rows={rows} />
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
      <MyTradesSkeleton />
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.my_trades_error()} />;
}
