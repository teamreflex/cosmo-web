import Portal from "@/components/portal";
import HelpDialog from "@/components/progress/help-dialog";
import ProgressOverview, {
  ProgressOverviewError,
  ProgressOverviewSkeleton,
} from "@/components/progress/progress-overview";
import ProgressRenderer from "@/components/progress/progress-renderer";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import {
  artistStatsQuery,
  memberCompletionQuery,
  progressBreakdownQuery,
  progressLeaderboardQuery,
  progressRankQuery,
} from "@/lib/queries/progress";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { progressFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { Addresses, isEqual } from "@apollo/util";
import { noop } from "@tanstack/react-query";
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
      context.queryClient.query({
        ...context.targetAccountOptions,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...currentAccountQuery,
        staleTime: "static",
      }),
    ]);

    // SPIN's progress isn't supported, so there's nothing to fetch
    if (isEqual(target.cosmo.address, Addresses.SPIN)) {
      return { target, account };
    }

    void context.queryClient
      .query(artistStatsQuery(target.cosmo.address))
      .catch(noop);
    void context.queryClient
      .query(memberCompletionQuery(target.cosmo.address))
      .catch(noop);

    // a member filter swaps the overview out for the member's breakdown
    if (deps.member) {
      const onlineType = deps.filter ?? undefined;
      void context.queryClient
        .query(progressBreakdownQuery(target.cosmo.address, deps.member))
        .catch(noop);
      // the rank card ignores the leaderboard's season filter
      void context.queryClient
        .query(
          progressRankQuery(
            target.cosmo.address,
            deps.member,
            onlineType,
            undefined,
          ),
        )
        .catch(noop);

      // the leaderboard sheet opens via search param
      if (deps.leaderboard) {
        const season = deps.season ?? undefined;
        void context.queryClient
          .query(progressLeaderboardQuery(deps.member, onlineType, season))
          .catch(noop);
        void context.queryClient
          .query(
            progressRankQuery(
              target.cosmo.address,
              deps.member,
              onlineType,
              season,
            ),
          )
          .catch(noop);
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
          {isEqual(target.cosmo.address, Addresses.SPIN) ? (
            <p className="container py-12 text-center text-sm font-semibold text-muted-foreground">
              {m.progress_spin_unsupported()}
            </p>
          ) : (
            <ProgressRenderer address={target.cosmo.address}>
              <ErrorBoundary fallback={<ProgressOverviewError />}>
                <Suspense fallback={<ProgressOverviewSkeleton />}>
                  <ProgressOverview address={target.cosmo.address} />
                </Suspense>
              </ErrorBoundary>
            </ProgressRenderer>
          )}
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
    <div className="container flex flex-col gap-6 pt-4">
      <ProgressOverviewSkeleton />
    </div>
  );
}
