import { Error } from "@/components/error-boundary";
import MyTrades from "@/components/trades/my-trades";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { activeTradesQuery, finishedTradesQuery } from "@/lib/queries/trades";
import { myTradesTabs } from "@/lib/universal/trades";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

export const Route = createFileRoute("/market/trades")({
  validateSearch: z.object({
    tab: z.enum(myTradesTabs).default("active").catch("active"),
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
  // the live trades give the counts on either tab
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.query({ ...activeTradesQuery, staleTime: "static" }),
      deps.tab === "finished" &&
        context.queryClient.infiniteQuery({
          ...finishedTradesQuery(),
          staleTime: "static",
        }),
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
  const { data: active } = useSuspenseQuery(activeTradesQuery);

  return (
    <main className="flex flex-col">
      <MyTrades tab={tab} active={active.rows} />
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
      <div className="border-b border-border">
        <div className="container flex flex-wrap items-center gap-x-3 gap-y-3 py-3 md:h-14 md:flex-nowrap md:py-0">
          <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
            {m.my_trades_title()}
          </h1>
          <Skeleton className="h-10 w-44 rounded-sm max-md:basis-full md:ml-auto md:h-9" />
        </div>
      </div>
      <div className="container py-4">
        <div className="flex flex-col gap-px overflow-clip rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-none" />
          ))}
        </div>
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.my_trades_error()} />;
}
