import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { progressFrontendSchema } from "@/lib/universal/parsers";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ProfileProvider } from "@/hooks/use-profile";
import ProgressRenderer from "@/components/progress/progress-renderer";
import {
  ProgressChartsError,
  ProgressChartsSkeleton,
} from "@/components/progress/charts/progress-charts-state";
import ProgressCharts from "@/components/progress/charts/progress-charts";
import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import { artistStatsQuery } from "@/lib/queries/progress";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/@{$username}/progress")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: progressFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(filterDataQuery);

    const [target, account] = await Promise.all([
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    context.queryClient.prefetchQuery(artistStatsQuery(target.cosmo.address));

    return { target, account };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.target.cosmo.username
        ? m.progress_title_with_username({
            username: loaderData.target.cosmo.username,
          })
        : m.progress_title(),
      canonical: `/@${loaderData?.target.cosmo.username}/progress`,
    }),
});

function RouteComponent() {
  const { target, account } = Route.useLoaderData();

  return (
    <section className="flex flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider target={target}>
          <ProgressRenderer address={target.cosmo.address}>
            <ErrorBoundary fallback={<ProgressChartsError />}>
              <Suspense fallback={<ProgressChartsSkeleton />}>
                <ProgressCharts address={target.cosmo.address} />
              </Suspense>
            </ErrorBoundary>
          </ProgressRenderer>
          <Portal to="#help">
            <HelpDialog />
          </Portal>
        </ProfileProvider>
      </UserStateProvider>
    </section>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <MemberFilterSkeleton artists={false} />
    </div>
  );
}
