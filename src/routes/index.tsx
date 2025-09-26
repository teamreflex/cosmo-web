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
  head: () => ({
    meta: [seoTitle("Objekts")],
  }),
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  validateSearch: objektIndexFrontendSchema,
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
        objektIndexTypesenseQuery(deps.searchParams, selected)
      );
    } else {
      // prefetch blockchain
      context.queryClient.prefetchInfiniteQuery(
        objektIndexBlockchainQuery(deps.searchParams, selected)
      );
    }

    // fetch slower required data
    await context.queryClient.ensureQueryData(currentAccountQuery);

    return { artists };
  },
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
        <div className="flex gap-2 items-center w-full pb-1">
          <div className="flex gap-2 items-center h-9">
            <h1 className="text-2xl md:text-3xl font-cosmo uppercase">
              Objekts
            </h1>
          </div>
        </div>

        {/* FiltersContainer */}
        <div className="flex flex-col gap-2 group lg:pb-2 pb-0">
          <div className="flex flex-row items-center justify-center gap-2 sm:hidden">
            <Skeleton className="w-20 h-9 rounded-full" />
          </div>

          <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-24 h-9" />
            ))}
            <Skeleton className="w-48 h-9" />
            <Skeleton className="w-[42px] h-[36px]" />
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
