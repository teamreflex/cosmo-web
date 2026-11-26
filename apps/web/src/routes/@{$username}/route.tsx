import ProfileFeedbackChip from "@/components/feedback/profile-feedback-chip";
import UserBalances, {
  ComoBalanceErrorFallback,
} from "@/components/navbar/como-balances";
import ProfileActions from "@/components/profile/profile-actions";
import ProfileAvatar from "@/components/profile/profile-avatar";
import ProfileIdentity from "@/components/profile/profile-identity";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { defineHead } from "@/lib/meta";
import { tokenBalancesQuery } from "@/lib/queries/como";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { feedbackSummaryQuery } from "@/lib/queries/feedback";
import { pinsQuery } from "@/lib/queries/profile";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { profileFrontendSchema } from "@/lib/universal/parsers";
import { BinderViewerProvider } from "@/providers/binder-viewer-provider";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { ProfileHelpProvider } from "@/providers/profile-help-provider";
import { Addresses, isEqual } from "@apollo/util";
import { IconAlertCircle } from "@tabler/icons-react";
import { noop } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
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
  loader: async ({ context }) => {
    const [account, target] = await Promise.all([
      context.queryClient.query({
        ...currentAccountQuery,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...context.targetAccountOptions,
        staleTime: "static",
      }),
    ]);

    // the owner's binder viewer reads the pins on every tab
    if (target.user !== undefined && account?.user.id === target.user.id) {
      void context.queryClient.query(context.pinsOptions).catch(noop);
    }

    void context.queryClient
      .query(tokenBalancesQuery(target.cosmo.address))
      .catch(noop);
    void context.queryClient
      .query(feedbackSummaryQuery(target.cosmo.address))
      .catch(noop);

    return { account, target };
  },
  /**
   * Titles the not-found state, which this layout renders in place of any
   * child route.
   */
  head: ({ match }) =>
    match.status === "notFound"
      ? defineHead({ title: m.error_not_found_title() })
      : {},
});

function RouteComponent() {
  const { account, target } = Route.useLoaderData();

  const isAuthenticated = account?.cosmo?.address === target.cosmo.address;
  const isOwner =
    target.user !== undefined && account?.user.id === target.user.id;

  return (
    <MetadataDialogProvider>
      <ProfileHelpProvider>
        <main className="relative flex flex-col">
          <BinderViewerProvider
            userId={target.user?.id}
            username={profileIdentifier(target.cosmo)}
            isOwner={isOwner}
          >
            {/* the accent glow is the header's own background so it also tints the translucent border, and follows the container so it stays under the identity block on wide screens */}
            <div className="border-b border-border [background:radial-gradient(900px_280px_at_max(20%,calc(50%_-_460px))_0%,color-mix(in_oklch,var(--color-cosmo)_12.6%,transparent),transparent_60%)]">
              <div className="container flex flex-col gap-4 pt-6 pb-3 md:flex-row md:items-center md:gap-6">
                {/* avatar */}
                <ProfileAvatar
                  username={target.cosmo.username}
                  avatar={target.user?.avatar ?? null}
                  ownerAddress={isOwner ? target.cosmo.address : null}
                />

                {/* identity */}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2">
                    <Link
                      to="/@{$username}"
                      params={{ username: profileIdentifier(target.cosmo) }}
                      className="font-cosmo text-2xl leading-none font-black uppercase underline decoration-transparent underline-offset-4 transition-colors hover:decoration-cosmo md:text-3xl"
                    >
                      {target.cosmo.username}
                    </Link>

                    <div className="flex items-center gap-2">
                      <ProfileIdentity
                        modhaus={isEqual(target.cosmo.address, Addresses.SPIN)}
                        verified={target.verified}
                        discord={
                          target.user?.showSocials === true
                            ? target.user.social.discord
                            : undefined
                        }
                        twitter={
                          target.user?.showSocials === true
                            ? target.user.social.twitter
                            : undefined
                        }
                      />
                      <ProfileFeedbackChip
                        address={target.cosmo.address}
                        username={profileIdentifier(target.cosmo)}
                        hasAccount={target.user !== undefined}
                      />
                      <ProfileActions
                        address={target.cosmo.address}
                        report={
                          account &&
                          target.user &&
                          account.user.id !== target.user.id
                            ? {
                                userId: target.user.id,
                                username: target.cosmo.username,
                              }
                            : undefined
                        }
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
      </ProfileHelpProvider>
    </MetadataDialogProvider>
  );
}

function PendingComponent() {
  return (
    <main className="relative flex flex-col">
      <div className="border-b border-border">
        <div className="container flex flex-col gap-3 pt-6 pb-3 md:flex-row md:items-center md:gap-6">
          <Skeleton className="size-16 rounded-full md:size-22" />
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
