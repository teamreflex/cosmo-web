import { AccountSection } from "@/components/auth/account/account-section";
import DeleteAccount from "@/components/auth/account/delete-account";
import LinkedAccounts from "@/components/auth/account/linked-accounts";
import NotificationsSection from "@/components/auth/account/notifications";
import PreferencesSection from "@/components/auth/account/preferences";
import ProfileSection from "@/components/auth/account/profile";
import LinkCosmo from "@/components/auth/link-cosmo";
import { Error } from "@/components/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { shortAddress } from "@apollo/util";
import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconLink,
  IconLock,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

/**
 * The profile and sign-in sections read Better Auth's client session, which
 * only the browser holds, so the page renders on the client.
 */
export const Route = createFileRoute("/account")({
  ssr: "data-only",
  beforeLoad: async ({ context }) => {
    const account = await context.queryClient.query({
      ...currentAccountQuery,
      staleTime: "static",
    });
    if (!account) {
      throw redirect({ to: "/" });
    }
  },
  head: () =>
    defineHead({
      title: m.common_account(),
      canonical: "/account",
      denyRobots: true,
    }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
});

function RouteComponent() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  if (!account) {
    return null;
  }

  return (
    <main className="container flex flex-col py-2">
      <h1 className="sr-only">{m.common_account()}</h1>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <SectionMenu />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <ProfileSection />
          </Suspense>

          <AccountSection id="sign-in" title={m.account_section_sign_in()}>
            <div className="px-4 py-4 sm:px-6">
              <Suspense
                fallback={
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                }
              >
                <LinkedAccounts />
              </Suspense>
            </div>
          </AccountSection>

          <AccountSection
            id="cosmo"
            title={m.common_cosmo()}
            description={m.link_cosmo_description({
              appName: env.VITE_APP_NAME,
            })}
          >
            <div className="px-4 py-4 sm:px-6">
              <CosmoAccount cosmo={account.cosmo} />
            </div>
          </AccountSection>

          <PreferencesSection user={account.user} />

          <NotificationsSection user={account.user} />

          <section
            id="delete"
            aria-labelledby="delete-title"
            className="flex scroll-mt-20 flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-destructive/30 px-4 py-4 sm:px-6"
          >
            <div className="min-w-60 flex-1">
              <h2 id="delete-title" className="font-semibold">
                {m.delete_account_title()}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {m.account_delete_description({ appName: env.VITE_APP_NAME })}
              </p>
            </div>
            <DeleteAccount />
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionMenu() {
  const items = [
    { id: "profile", label: m.account_section_profile(), icon: IconUser },
    { id: "sign-in", label: m.account_section_sign_in(), icon: IconLock },
    { id: "cosmo", label: m.common_cosmo(), icon: IconLink },
    {
      id: "preferences",
      label: m.account_section_preferences(),
      icon: IconAdjustmentsHorizontal,
    },
    {
      id: "notifications",
      label: m.account_section_notifications(),
      icon: IconBell,
    },
  ];

  return (
    <nav
      aria-label={m.account_sections()}
      className="sticky top-20 hidden w-52 shrink-0 flex-col gap-1 lg:flex"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="flex h-9 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <item.icon className="size-4" />
          {item.label}
        </a>
      ))}
      <a
        href="#delete"
        className="flex h-9 items-center gap-2.5 rounded-md px-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <IconTrash className="size-4" />
        {m.delete_account_title()}
      </a>
    </nav>
  );
}

function CosmoAccount({ cosmo }: { cosmo: PublicCosmo | undefined }) {
  if (cosmo === undefined) {
    return <LinkCosmo />;
  }

  return (
    <div className="flex items-center gap-3">
      <img
        className="size-9 shrink-0 rounded-md"
        src="/cosmo.webp"
        alt={m.common_cosmo()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{cosmo.username}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {shortAddress(cosmo.address)}
        </span>
      </div>
      <Badge variant="outline">{m.account_cosmo_linked()}</Badge>
    </div>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-6 px-4 py-5 sm:px-6">
          <Skeleton className="hidden h-5 w-40 sm:block" />
          <Skeleton className="h-9 flex-1" />
        </div>
      ))}
    </div>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      <div className="mx-auto w-full max-w-5xl lg:pl-60">
        <SectionSkeleton rows={4} />
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.account_error()} />;
}
