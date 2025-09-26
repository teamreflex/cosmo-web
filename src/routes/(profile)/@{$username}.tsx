import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import CopyAddressButton from "@/components/profile/copy-address-button";
import TradesButton from "@/components/profile/trades-button";
import ComoButton from "@/components/profile/como-button";
import ProgressButton from "@/components/profile/progress-button";
import UserAvatar from "@/components/profile/user-avatar";
import UserBalances, {
  ComoBalanceErrorFallback,
} from "@/components/navbar/como-balances";
import { Addresses, isEqual } from "@/lib/utils";
import {
  CosmoVerifiedBadge,
  DiscordBadge,
  ModhausBadge,
  TwitterBadge,
} from "@/components/profile/profile-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env/client";
import { currentAccountQuery, targetAccountQuery } from "@/queries";
import ListDropdown from "@/components/lists/list-dropdown";

export const Route = createFileRoute("/(profile)/@{$username}")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  loader: async ({ context, params }) => {
    const [account, target] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
    ]);

    const isAuthenticated = account?.cosmo?.address === target.cosmo.address;

    return {
      target,
      isAuthenticated,
    };
  },
});

function RouteComponent() {
  const { target, isAuthenticated } = Route.useLoaderData();

  return (
    <main className="relative container flex flex-col py-2">
      <div className="grid grid-rows-[auto_auto_min-content] grid-cols-2 md:grid-cols-3 gap-2 md:h-24">
        {/* user block */}
        <div className="row-span-2 md:row-span-3 flex flex-row gap-4">
          <UserAvatar className="w-24 h-24" username={target.cosmo.username} />

          <div className="flex flex-row">
            <div className="flex flex-col gap-2 justify-center h-24">
              <Link
                to="/@{$username}"
                params={{ username: target.cosmo.username }}
                className="w-fit text-2xl leading-6 font-cosmo uppercase underline underline-offset-4 decoration-transparent hover:decoration-cosmo transition-colors"
              >
                {target.cosmo.username}
              </Link>

              <ErrorBoundary fallback={<ComoBalanceErrorFallback />}>
                <Suspense
                  fallback={
                    <div className="flex items-center gap-2">
                      <div className="h-[26px] w-16 rounded-lg bg-secondary border border-border animate-pulse" />
                      <div className="h-[26px] w-16 rounded-lg bg-secondary border border-border animate-pulse" />
                    </div>
                  }
                >
                  <UserBalances address={target.cosmo.address} />
                </Suspense>
              </ErrorBoundary>

              {/* badges? */}
              <div className="flex flex-row gap-2 h-5">
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
        <div className="row-start-3 md:row-start-auto col-span-3 md:col-span-2 flex flex-wrap gap-2 justify-center md:justify-end">
          <CopyAddressButton address={target.cosmo.address} />
          <TradesButton cosmo={target.cosmo} />
          <ComoButton cosmo={target.cosmo} />
          <ProgressButton cosmo={target.cosmo} />
          <ListDropdown
            objektLists={target.objektLists}
            allowCreate={isAuthenticated}
            createListUrl={(list) =>
              `/@${target.cosmo.username}/list/${list.slug}`
            }
          />

          {/* content gets portaled in */}
          <div
            className="h-10 lg:h-8 flex items-center empty:hidden"
            id="help"
          />
          <div
            className="h-10 flex items-center lg:hidden"
            id="filters-button"
          />
        </div>

        {/* objekt total, gets portaled in */}
        <div className="flex col-start-3 row-start-2 md:row-start-3 h-6 place-self-end">
          <span id="objekt-total" />
        </div>
      </div>

      <Outlet />
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="relative container flex flex-col py-2">
      <div className="grid grid-rows-[auto_auto_min-content] grid-cols-2 md:grid-cols-3 gap-2 md:h-24">
        {/* user block */}
        <div className="row-span-2 md:row-span-3 flex flex-row gap-4">
          <Skeleton className="h-24 w-24 rounded-full aspect-square" />

          <div className="flex flex-row">
            <div className="flex flex-col gap-2 justify-center h-24">
              {/* username */}
              <Skeleton className="rounded-full w-24 h-6 py-0.5" />

              {/* como balance */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-[26px] w-16 rounded-lg" />
                <Skeleton className="h-[26px] w-16 rounded-lg" />
              </div>

              {/* badges */}
              <div className="flex flex-row gap-2 h-5">
                <Skeleton className="h-4 w-4 aspect-square shrink-0 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* profile-related buttons */}
        <div className="row-start-3 md:row-start-auto col-span-3 md:col-span-2 flex flex-wrap gap-2 justify-center md:justify-end">
          {/* copy address */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[84px] lg:h-8 shrink-0" />
          {/* trades */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[75px] lg:h-8 shrink-0" />
          {/* como */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[75px] lg:h-8 shrink-0" />
          {/* progress */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[88px] lg:h-8 shrink-0" />
          {/* lists */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[63px] lg:h-8 shrink-0" />
          {/* help */}
          <Skeleton className="rounded-full aspect-square h-10 lg:h-8 shrink-0" />
          {/* filters */}
          <Skeleton className="rounded-full flex w-10 h-10 lg:hidden lg:w-[89px] lg:h-8 shrink-0" />
        </div>

        {/* objekt total, gets portaled in */}
        <div className="flex col-start-3 row-start-2 md:row-start-3 h-6 place-self-end">
          <span id="objekt-total" />
        </div>
      </div>
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <CircleAlert className="h-24 w-24" />
      <p className="text-sm font-semibold">User not found</p>
      <p className="text-sm text-center text-balance w-64">
        User could not be found in {env.VITE_APP_NAME} or COSMO.
      </p>
    </main>
  );
}
