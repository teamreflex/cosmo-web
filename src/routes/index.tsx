import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
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
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { objektIndexFrontendSchema } from "@/lib/universal/parsers";
import { seoTitle } from "@/lib/seo";
import {
  objektIndexBlockchainQuery,
  objektIndexTypesenseQuery,
} from "@/lib/queries/objekt-queries";

export const Route = createFileRoute("/")({
  validateSearch: objektIndexFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    // prefetch filter data
    context.queryClient.prefetchQuery(filterDataQuery);

    // load quick required data
    const [artists, selected] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    // prefetch objekts
    const searchTerm = deps.searchParams.search ?? "";
    if (searchTerm) {
      // prefetch typesense
      context.queryClient.prefetchInfiniteQuery(
        objektIndexTypesenseQuery(deps.searchParams, selected),
      );
    } else {
      // prefetch blockchain
      context.queryClient.prefetchInfiniteQuery(
        objektIndexBlockchainQuery(deps.searchParams, selected),
      );
    }

    // fetch slower required data
    await context.queryClient.ensureQueryData(currentAccountQuery);

    return { artists };
  },
  head: () => ({
    meta: [seoTitle("Objekts")],
  }),
});

function RouteComponent() {
  const { artists } = Route.useLoaderData();
  const [account, selected] = useSuspenseQueries({
    queries: [currentAccountQuery, selectedArtistsQuery],
  });

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account.data?.user} cosmo={account.data?.cosmo}>
        <ArtistProvider artists={artists} selected={selected.data}>
          <ProfileProvider objektLists={account.data?.objektLists ?? []}>
            <IndexRenderer objektLists={account.data?.objektLists ?? []} />
          </ProfileProvider>
        </ArtistProvider>
      </UserStateProvider>
    </main>
  );
}

function ErrorComponent() {
  return <Error message="Could not load objekts" />;
}

function PendingComponent() {
  return (
    <div className="container flex flex-col py-2">
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex w-full items-center gap-2 pb-1">
          <div className="flex h-9 items-center gap-2">
            <h1 className="font-cosmo text-2xl uppercase md:text-3xl">
              Objekts
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
