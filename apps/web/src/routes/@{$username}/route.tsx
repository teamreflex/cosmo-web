import ProfileListDropdown from "@/components/lists/profile-list-dropdown";
import UserBalances, {
  ComoBalanceErrorFallback,
} from "@/components/navbar/como-balances";
import ComoButton from "@/components/profile/como-button";
import CopyAddressButton from "@/components/profile/copy-address-button";
import {
  CosmoVerifiedBadge,
  DiscordBadge,
  ModhausBadge,
  TwitterBadge,
} from "@/components/profile/profile-badges";
import ProgressButton from "@/components/profile/progress-button";
import TradesButton from "@/components/profile/trades-button";
import UserAvatar from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { UserStateProvider } from "@/providers/user-state-provider";
import { Addresses, isEqual } from "@apollo/util";
import { IconAlertCircle, IconList } from "@tabler/icons-react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export const Route = createFileRoute("/@{$username}")({
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
  pendingComponent: PendingComponent,
  loader: async ({ context, params }) => {
    const [account, target] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
    ]);

    return { account, target };
  },
});

function RouteComponent() {
  const { account, target } = Route.useLoaderData();

  const isAuthenticated = account?.cosmo?.address === target.cosmo.address;

  return (
    <UserStateProvider {...account}>
      <main className="relative flex flex-col">
        {/* profile header with accent background */}
        <div className="relative border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(900px_220px_at_10%_0%,color-mix(in_oklch,var(--color-cosmo)_18%,transparent),transparent_60%)]"
          />
          <div className="relative container flex flex-col gap-4 py-6 pb-4 md:flex-row md:items-center md:gap-6">
            {/* avatar */}
            <UserAvatar
              variant="square"
              className="size-16 md:size-22"
              username={target.cosmo.username}
            />

            {/* identity */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to="/@{$username}"
                  params={{ username: target.cosmo.username }}
                  className="font-cosmo text-2xl leading-none font-black uppercase underline decoration-transparent underline-offset-4 transition-colors hover:decoration-cosmo md:text-3xl"
                >
                  {target.cosmo.username}
                </Link>

                <div className="flex flex-row items-center gap-1.5">
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

              <div className="flex h-10 items-stretch divide-x divide-border [&>*:has(+:empty:last-child)]:border-e-0">
                <ErrorBoundary fallback={<ComoBalanceErrorFallback />}>
                  <Suspense
                    fallback={
                      <div className="flex items-center pr-4 first:pl-0 last:pr-0">
                        <Skeleton className="h-10 w-24" />
                      </div>
                    }
                  >
                    <UserBalances address={target.cosmo.address} />
                  </Suspense>
                </ErrorBoundary>
                <div
                  id="profile-total-stat"
                  className="flex min-w-0 flex-col gap-0.5 pl-4 empty:hidden first:pl-0"
                />
              </div>
            </div>

            {/* action cluster */}
            <div className="-mx-4 flex flex-nowrap items-center justify-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:self-end md:overflow-visible md:p-0">
              <CopyAddressButton address={target.cosmo.address} />
              <TradesButton cosmo={target.cosmo} />
              <ComoButton cosmo={target.cosmo} />
              <ProgressButton cosmo={target.cosmo} />
              <Suspense
                fallback={
                  <Button
                    className="animate-pulse"
                    variant="outline"
                    size="profile"
                    data-profile
                  >
                    <IconList className="h-5 w-5" />
                    <span className="hidden sm:block">{m.list_lists()}</span>
                  </Button>
                }
              >
                <ProfileListDropdown
                  username={target.cosmo.username}
                  isAuthenticated={isAuthenticated}
                />
              </Suspense>

              {/* content gets portaled in */}
              <div
                className="flex h-10 items-center empty:hidden lg:h-8"
                id="help"
              />
            </div>
          </div>
        </div>

        <Outlet />
      </main>
    </UserStateProvider>
  );
}

function PendingComponent() {
  return (
    <main className="relative flex flex-col">
      <div className="border-b border-border">
        <div className="container flex flex-col gap-4 py-6 md:flex-row md:items-center md:gap-6">
          <Skeleton className="size-16 rounded-sm md:size-22" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10.5 w-36 rounded-sm" />
          </div>
          <div className="-mx-4 flex flex-nowrap items-center justify-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:self-end md:overflow-visible md:p-0">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconAlertCircle className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.error_not_found_title()}</p>
      <p className="w-64 text-center text-sm text-balance">
        {m.error_not_found_description({ appName: env.VITE_APP_NAME })}
      </p>
    </main>
  );
}
