import Portal from "@/components/portal";
import ProgressCharts from "@/components/progress/charts/progress-charts";
import {
  ProgressChartsError,
  ProgressChartsSkeleton,
} from "@/components/progress/charts/progress-charts-state";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressRenderer from "@/components/progress/progress-renderer";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import {
  artistStatsQuery,
  progressBreakdownQuery,
  progressLeaderboardQuery,
} from "@/lib/queries/progress";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { progressFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export const Route = createFileRoute("/@{$username}/progress")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: progressFrontendSchema,
  loaderDeps: ({ search }) => ({
    member: search.member,
    filter: search.filter,
    season: search.season,
    leaderboard: search.leaderboard,
  }),
  loader: async ({ context, deps }) => {
    const [target, account] = await Promise.all([
      context.queryClient.ensureQueryData(context.targetAccountOptions),
      context.queryClient.ensureQueryData(currentAccountQuery),
    ]);

    void context.queryClient.prefetchQuery(
      artistStatsQuery(target.cosmo.address),
    );

    // a member filter swaps the charts out for the breakdown table
    if (deps.member) {
      void context.queryClient.prefetchQuery(
        progressBreakdownQuery(target.cosmo.address, deps.member),
      );

      // the leaderboard sheet opens via search param
      if (deps.leaderboard) {
        void context.queryClient.prefetchQuery(
          progressLeaderboardQuery(
            deps.member,
            deps.filter ?? undefined,
            deps.season ?? undefined,
          ),
        );
      }
    }

    return { target, account };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.target.cosmo.username
        ? m.progress_title_with_username({
            username: loaderData.target.cosmo.username,
          })
        : m.progress_title(),
      canonical:
        loaderData &&
        `/@${profileIdentifier(loaderData.target.cosmo)}/progress`,
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
      <TitleHeader title={m.progress_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilterSkeleton />
          </div>
        </div>
      </TitleHeader>
    </div>
  );
}
