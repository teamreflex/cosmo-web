import MarketFeed from "@/components/admin/market/market-feed";
import MarketSummary from "@/components/admin/market/market-summary";
import MarketToolbar from "@/components/admin/market/market-toolbar";
import AdminNoAccess from "@/components/admin/no-access";
import StaffRoleMeta from "@/components/admin/staff-role-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  marketActivityQuery,
  marketSummaryQuery,
} from "@/lib/queries/market-activity";
import {
  type MarketActivityFilters,
  marketActivityStatuses,
  marketActivityViews,
  type MarketSnapshot,
} from "@/lib/universal/market-activity";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

export const Route = createFileRoute("/admin/market")({
  validateSearch: z.object({
    view: z.enum(marketActivityViews).optional().catch(undefined),
    status: z.enum(marketActivityStatuses).optional().catch(undefined),
  }),
  loaderDeps: ({ search: { view, status } }) => ({ view, status }),
  // built once here so the loader and the feed share the same cache key
  context: ({ deps }) => ({
    marketFilters: {
      view: deps.view ?? "all",
      status: deps.status,
    } satisfies MarketActivityFilters,
  }),
  beforeLoad: ({ context }) =>
    requirePermission(context.role, [{ trade: ["read-any"] }]),
  notFoundComponent: AdminNoAccess,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(marketSummaryQuery),
      context.queryClient.infiniteQuery(
        marketActivityQuery(context.marketFilters),
      ),
    ]);
  },
  head: () =>
    defineHead({ title: m.admin_market_title(), canonical: "/admin/market" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  const { marketFilters } = Route.useRouteContext();

  return (
    <section className="@container flex flex-col gap-4 p-4">
      <MarketActivity
        // a filter change starts over, with nothing marked new
        key={`${marketFilters.view}:${marketFilters.status ?? "any"}`}
        filters={marketFilters}
      />
    </section>
  );
}

function MarketActivity({ filters }: { filters: MarketActivityFilters }) {
  const [seen, setSeen] = useState<MarketSnapshot | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3 md:@3xl:flex-row md:@3xl:items-center md:@3xl:gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold">{m.admin_market_title()}</h1>
          <StaffRoleMeta className="ml-auto md:hidden" />
        </div>
        <MarketToolbar
          filters={filters}
          onRefresh={setSeen}
          className="md:@3xl:flex-1"
        />
      </div>

      <MarketSummary />
      <MarketFeed filters={filters} seen={seen} />
    </>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-56 md:ml-auto" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </section>
  );
}
