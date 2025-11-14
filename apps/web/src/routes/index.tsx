import { createFileRoute } from "@tanstack/react-router";
import { Error } from "@/components/error-boundary";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ProfileProvider } from "@/hooks/use-profile";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { objektIndexFrontendSchema } from "@/lib/universal/parsers";
import { objektIndexBlockchainQuery } from "@/lib/queries/objekt-queries";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  validateSearch: objektIndexFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    // prefetch filter data
    context.queryClient.prefetchQuery(filterDataQuery);

    // load required data
    const [account, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    // prefetch objekts
    if (!deps.searchParams.search) {
      // prefetch blockchain
      context.queryClient.prefetchInfiniteQuery(
        objektIndexBlockchainQuery(deps.searchParams, selected),
      );
    }

    return { account };
  },
  head: () => defineHead({ title: "Objekts", canonical: "/" }),
});

function RouteComponent() {
  const { account } = Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider objektLists={account?.objektLists ?? []}>
          <IndexRenderer objektLists={account?.objektLists ?? []} />
        </ProfileProvider>
      </UserStateProvider>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.error_could_not_load_objekts()} />;
}

function PendingComponent() {
  return (
    <div className="container flex flex-col py-2">
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex w-full items-center gap-2 pb-1">
          <div className="flex h-9 items-center gap-2">
            <h1 className="font-cosmo text-2xl uppercase md:text-3xl">
              {m.objekts_header()}
            </h1>
          </div>
        </div>

        {/* FiltersContainer */}
        <div className="group flex flex-col gap-2 pb-0 lg:pb-2">
          <div className="flex flex-row items-center justify-center gap-2 sm:hidden">
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>

          <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-[36px] w-[42px]" />
          </div>
        </div>

        {/* FilteredObjektDisplay */}
        <div className="flex flex-col">
          <MemberFilterSkeleton />
        </div>
      </div>
    </div>
  );
}
