import UserBalances, {
  ComoBalanceErrorFallback,
} from "@/components/navbar/como-balances";
import { ensureProfileTarget } from "@/components/profile/common";
import CopyAddressButton from "@/components/profile/copy-address-button";
import DeletedProfile from "@/components/profile/deleted-profile";
import {
  CosmoVerifiedBadge,
  DiscordBadge,
  ModhausBadge,
  TwitterBadge,
} from "@/components/profile/profile-badges";
import ProfileTabs from "@/components/profile/profile-tabs";
import ReportButton from "@/components/profile/report-button";
import UserAvatar from "@/components/profile/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { tokenBalancesQuery } from "@/lib/queries/como";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { pinsQuery } from "@/lib/queries/profile";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { profileFrontendSchema } from "@/lib/universal/parsers";
import { BinderViewerProvider } from "@/providers/binder-viewer-provider";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { Addresses, isEqual } from "@apollo/util";
import { IconAlertCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export const Route = createFileRoute("/@{$username}")({
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
  pendingComponent: PendingComponent,
  validateSearch: profileFrontendSchema,
  // built once here so the loader and every consumer share the same cache key
  context: ({ params }) => ({
    targetAccountOptions: targetAccountQuery(params.username),
    pinsOptions: pinsQuery(params.username),
  }),
  /**
   * A deleted account stops here, before any child loader fetches its
   * collection. It returns nothing, since a return value would be merged into
   * every child's context and serialized for SSR.
   */
  beforeLoad: async ({ context }) => {
    await ensureProfileTarget(
      context.queryClient,
      context.targetAccountOptions,
    );
  },
  loader: async ({ context }) => {
    const [account, target] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      ensureProfileTarget(context.queryClient, context.targetAccountOptions),
    ]);

    // the owner's binder viewer reads the pins on every tab
    if (target.user !== undefined && account?.user.id === target.user.id) {
      void context.queryClient.prefetchQuery(context.pinsOptions);
    }

    void context.queryClient.prefetchQuery(
      tokenBalancesQuery(target.cosmo.address),
    );

    return { account, target };
  },
});

function RouteComponent() {
  const { account, target } = Route.useLoaderData();

  const isAuthenticated = account?.cosmo?.address === target.cosmo.address;

  return (
    <UserStateProvider {...account}>
      <MetadataDialogProvider>
        <main className="relative flex flex-col">
          <BinderViewerProvider
            userId={target.user?.id}
            username={profileIdentifier(target.cosmo)}
            isOwner={
              target.user !== undefined && account?.user.id === target.user.id
            }
          >
            {/* the accent glow is the header's own background so it also tints the translucent border, and follows the container so it stays under the identity block on wide screens */}
            <div className="border-b border-border [background:radial-gradient(900px_280px_at_max(20%,calc(50%_-_460px))_0%,color-mix(in_oklch,var(--color-cosmo)_12.6%,transparent),transparent_60%)]">
              <div className="container flex flex-col gap-4 pt-6 pb-3 md:flex-row md:items-center md:gap-6">
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
                      params={{ username: profileIdentifier(target.cosmo) }}
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

                    <div className="flex items-center gap-0.5">
                      <CopyAddressButton address={target.cosmo.address} />
                      {account &&
                        target.user &&
                        account.user.id !== target.user.id && (
                          <ReportButton
                            userId={target.user.id}
                            username={target.cosmo.username}
                          />
                        )}
                      {/* content gets portaled in */}
                      <div
                        className="flex items-center empty:hidden"
                        id="help"
                      />
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
                      className="flex min-w-0 flex-col gap-0.5 pl-4 first:pl-0 empty:hidden"
                    />
                  </div>
                </div>
              </div>

              <ProfileTabs isAuthenticated={isAuthenticated} />
            </div>

            <Outlet />
          </BinderViewerProvider>
        </main>
      </MetadataDialogProvider>
    </UserStateProvider>
  );
}

function PendingComponent() {
  return (
    <main className="relative flex flex-col">
      <div className="border-b border-border">
        <div className="container flex flex-col gap-3 pt-6 pb-3 md:flex-row md:items-center md:gap-6">
          <Skeleton className="size-16 rounded-sm md:size-22" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10.5 w-36 rounded-sm" />
          </div>
        </div>
        <div className="container flex gap-2 py-3.5">
          <Skeleton className="h-5 flex-1 md:w-20 md:flex-none" />
          <Skeleton className="h-5 flex-1 md:w-16 md:flex-none" />
          <Skeleton className="h-5 flex-1 md:w-16 md:flex-none" />
          <Skeleton className="h-5 flex-1 md:w-18 md:flex-none" />
          <Skeleton className="h-5 flex-1 md:w-20 md:flex-none" />
          <Skeleton className="h-5 flex-1 md:w-14 md:flex-none" />
        </div>
        <div className="border-t border-border md:hidden">
          <div className="container flex h-14 items-center">
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </main>
  );
}

function NotFoundComponent() {
  const { targetAccountOptions } = Route.useRouteContext();
  /**
   * Read without subscribing: a query observer would refetch an unknown
   * user's errored query on mount.
   */
  const target = useQueryClient().getQueryData(targetAccountOptions.queryKey);

  if (target?.status === "deleted") {
    return <DeletedProfile />;
  }

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
