import FeedbackEntries, {
  RoleTabs,
} from "@/components/feedback/feedback-entries";
import FeedbackSummary from "@/components/feedback/feedback-summary";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { accountName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import {
  feedbackEntriesQuery,
  feedbackSummaryQuery,
} from "@/lib/queries/feedback";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import {
  feedbackSearchDefaults,
  feedbackSearchSchema,
} from "@/lib/universal/feedback";
import { IconStar, IconUserQuestion } from "@tabler/icons-react";
import { noop, useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Suspense } from "react";

/**
 * The feedback a profile's COSMO address received, so it shows the
 * address's history whichever Apollo account links it now. Nothing links
 * here yet; it opens by URL.
 */
export const Route = createFileRoute("/@{$username}/feedback")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  validateSearch: feedbackSearchSchema,
  // the defaults stay out of the URL, so the canonical address is the bare page
  search: {
    middlewares: [stripSearchParams(feedbackSearchDefaults)],
  },
  loaderDeps: ({ search: { role, rating } }) => ({ role, rating }),
  loader: async ({ context, deps }) => {
    const target = await context.queryClient.query({
      ...context.targetAccountOptions,
      staleTime: "static",
    });
    void context.queryClient
      .infiniteQuery(feedbackEntriesQuery(target.cosmo.address, deps))
      .catch(noop);
    await context.queryClient.query({
      ...currentAccountQuery,
      staleTime: "static",
    });
    await context.queryClient.query({
      ...feedbackSummaryQuery(target.cosmo.address),
      staleTime: "static",
    });

    return { cosmo: target.cosmo, hasAccount: target.user !== undefined };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.cosmo
        ? m.feedback_page_title_with_username({
            username: loaderData.cosmo.username,
          })
        : m.feedback_page_title(),
      canonical:
        loaderData && `/@${profileIdentifier(loaderData.cosmo)}/feedback`,
    }),
});

function RouteComponent() {
  const { cosmo, hasAccount } = Route.useLoaderData();
  const search = Route.useSearch();
  const [{ data: summary }, { data: account }] = useSuspenseQueries({
    queries: [feedbackSummaryQuery(cosmo.address), currentAccountQuery],
  });
  const hasPermission = useHasPermission();
  const name = `@${accountName(cosmo.username)}`;

  return (
    <section className="container flex flex-col gap-4.5 pt-5 pb-10">
      {/* the mobile toolbar names the page below md */}
      <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase max-md:sr-only">
        {m.feedback_page_title()}
      </h1>

      {summary.total > 0 ? (
        <>
          <FeedbackSummary summary={summary} />
          <div className="flex flex-col gap-3.5">
            <RoleTabs
              value={search.role}
              roles={summary.roles}
              total={summary.total}
            />
            {/* a new filter suspends only the list, not the role tabs */}
            <Suspense fallback={<EntriesSkeleton />}>
              <FeedbackEntries
                address={cosmo.address}
                ownerName={name}
                search={search}
                viewer={
                  account
                    ? {
                        userId: account.user.id,
                        canRemove: hasPermission({ feedback: ["remove-any"] }),
                      }
                    : null
                }
              />
            </Suspense>
          </div>
        </>
      ) : !hasAccount ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUserQuestion />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {m.feedback_page_no_account({ appName: env.VITE_APP_NAME })}
            </EmptyTitle>
            <EmptyDescription>
              {m.feedback_page_no_account_body({
                name,
                appName: env.VITE_APP_NAME,
              })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconStar />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {m.feedback_badge_none()}
            </EmptyTitle>
            <EmptyDescription>
              {m.feedback_page_empty_body({ name })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

function EntriesSkeleton() {
  return <Skeleton className="h-64 rounded-lg" />;
}

function PendingComponent() {
  return (
    <div className="container flex flex-col gap-4.5 pt-5 pb-10">
      <Skeleton className="h-5 w-28 max-md:hidden" />
      {/* the score and ratings panels; the averages panel shows only for some */}
      <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap">
        <Skeleton className="h-32 rounded-lg md:flex-[1_1_240px]" />
        <Skeleton className="h-32 rounded-lg md:flex-[1_1_240px]" />
      </div>
      <EntriesSkeleton />
    </div>
  );
}
