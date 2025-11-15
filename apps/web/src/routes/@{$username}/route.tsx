import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { Addresses, isEqual } from "@apollo/util";
import CopyAddressButton from "@/components/profile/copy-address-button";
import TradesButton from "@/components/profile/trades-button";
import ComoButton from "@/components/profile/como-button";
import ProgressButton from "@/components/profile/progress-button";
import UserAvatar from "@/components/profile/user-avatar";
import UserBalances, {
  ComoBalanceErrorFallback,
} from "@/components/navbar/como-balances";
import {
  CosmoVerifiedBadge,
  DiscordBadge,
  ModhausBadge,
  TwitterBadge,
} from "@/components/profile/profile-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env/client";
import { m } from "@/i18n/messages";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import ListDropdown from "@/components/lists/list-dropdown";

export const Route = createFileRoute("/@{$username}")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(currentAccountQuery);
    context.queryClient.prefetchQuery(targetAccountQuery(params.username));
  },
});

function RouteComponent() {
  return (
    <main className="relative container flex flex-col py-2">
      <Suspense fallback={<PendingComponent />}>
        <ProfileLayoutContent />
      </Suspense>

      <Outlet />
    </main>
  );
}

function ProfileLayoutContent() {
  const params = Route.useParams();
  const [{ data: account }, { data: target }] = useSuspenseQueries({
    queries: [currentAccountQuery, targetAccountQuery(params.username)],
  });

  const isAuthenticated = account?.cosmo?.address === target.cosmo.address;

  return (
    <div className="grid grid-cols-2 grid-rows-[auto_auto_min-content] gap-2 md:h-24 md:grid-cols-3">
      {/* user block */}
      <div className="row-span-2 flex flex-row gap-4 md:row-span-3">
        <UserAvatar className="h-24 w-24" username={target.cosmo.username} />

        <div className="flex flex-row">
          <div className="flex h-24 flex-col justify-center gap-2">
            <Link
              to="/@{$username}"
              params={{ username: target.cosmo.username }}
              className="w-fit font-cosmo text-2xl leading-6 uppercase underline decoration-transparent underline-offset-4 transition-colors hover:decoration-cosmo"
            >
              {target.cosmo.username}
            </Link>

            <ErrorBoundary fallback={<ComoBalanceErrorFallback />}>
              <Suspense
                fallback={
                  <div className="flex items-center gap-2">
                    <div className="h-[26px] w-16 animate-pulse rounded-lg border border-border bg-secondary" />
                    <div className="h-[26px] w-16 animate-pulse rounded-lg border border-border bg-secondary" />
                  </div>
                }
              >
                <UserBalances address={target.cosmo.address} />
              </Suspense>
            </ErrorBoundary>

            {/* badges? */}
            <div className="flex h-5 flex-row gap-2">
              {target.verified && <CosmoVerifiedBadge />}
              {isEqual(target.cosmo.address, Addresses.SPIN) && (
                <ModhausBadge />
              )}
              {target.user?.showSocials === true &&
                target.user.social.discord !== undefined && (
                  <DiscordBadge handle={target.user.social.discord} />
                )}
              {target.user?.showSocials === true &&
                target.user.social.twitter !== undefined && (
                  <TwitterBadge handle={target.user.social.twitter} />
                )}
            </div>
          </div>
        </div>
      </div>

      {/* profile-related buttons */}
      <div className="col-span-3 row-start-3 flex flex-wrap justify-center gap-2 md:col-span-2 md:row-start-auto md:justify-end">
        <CopyAddressButton address={target.cosmo.address} />
        <TradesButton cosmo={target.cosmo} />
        <ComoButton cosmo={target.cosmo} />
        <ProgressButton cosmo={target.cosmo} />
        <ListDropdown
          username={target.cosmo.username}
          objektLists={target.objektLists}
          allowCreate={isAuthenticated}
          createListUrl={(list) =>
            `/@${target.cosmo.username}/list/${list.slug}`
          }
        />

        {/* content gets portaled in */}
        <div className="flex h-10 items-center empty:hidden lg:h-8" id="help" />
        <div className="flex h-10 items-center lg:hidden" id="filters-button" />
      </div>

      {/* objekt total, gets portaled in */}
      <div className="col-start-3 row-start-2 flex h-6 place-self-end md:row-start-3">
        <span id="objekt-total" />
      </div>
    </div>
  );
}

function PendingComponent() {
  return (
    <main className="relative container flex flex-col py-2">
      <div className="grid grid-cols-2 grid-rows-[auto_auto_min-content] gap-2 md:h-24 md:grid-cols-3">
        {/* user block */}
        <div className="row-span-2 flex flex-row gap-4 md:row-span-3">
          <Skeleton className="aspect-square h-24 w-24 rounded-full" />

          <div className="flex flex-row">
            <div className="flex h-24 flex-col justify-center gap-2">
              {/* username */}
              <Skeleton className="h-6 w-24 rounded-full py-0.5" />

              {/* como balance */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-[26px] w-16 rounded-lg" />
                <Skeleton className="h-[26px] w-16 rounded-lg" />
              </div>

              {/* badges */}
              <div className="flex h-5 flex-row gap-2">
                <Skeleton className="aspect-square h-4 w-4 shrink-0 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* profile-related buttons */}
        <div className="col-span-3 row-start-3 flex flex-wrap justify-center gap-2 md:col-span-2 md:row-start-auto md:justify-end">
          {/* copy address */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:h-8 lg:w-[84px]" />
          {/* trades */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:h-8 lg:w-[75px]" />
          {/* como */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:h-8 lg:w-[75px]" />
          {/* progress */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:h-8 lg:w-[88px]" />
          {/* lists */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-full lg:h-8 lg:w-[63px]" />
          {/* help */}
          <Skeleton className="aspect-square h-10 shrink-0 rounded-full lg:h-8" />
          {/* filters */}
          <Skeleton className="flex h-10 w-10 shrink-0 rounded-full lg:hidden lg:h-8 lg:w-[89px]" />
        </div>

        {/* objekt total, gets portaled in */}
        <div className="col-start-3 row-start-2 flex h-6 place-self-end md:row-start-3">
          <span id="objekt-total" />
        </div>
      </div>
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <CircleAlert className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.error_not_found_title()}</p>
      <p className="w-64 text-center text-sm text-balance">
        {m.error_not_found_description({ appName: env.VITE_APP_NAME })}
      </p>
    </main>
  );
}
