import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { HeartCrack } from "lucide-react";
import { Error } from "@/components/error-boundary";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { seoTitle } from "@/lib/seo";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { getObjektListWithUser } from "@/lib/server/objekts/lists";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";
import ListRenderer from "@/components/lists/list-renderer";
import { sanitizeUuid } from "@/lib/utils";

export const Route = createFileRoute("/list/$id")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  validateSearch: objektListFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(filterDataQuery);

    // sanitize the id due to discord users accidentally appending formatting to the URL
    const sanitizedId = sanitizeUuid(params.id);
    if (!sanitizedId) {
      throw notFound();
    }

    // kick off loading of objekt list entries
    const selected =
      await context.queryClient.ensureQueryData(selectedArtistsQuery);
    context.queryClient.prefetchInfiniteQuery(
      objektListQuery(sanitizedId, deps.searchParams, selected),
    );

    // load required data
    const [artists, account, objektListWithUser] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(currentAccountQuery),
      getObjektListWithUser({ data: { id: sanitizedId } }),
    ]);

    if (!objektListWithUser) {
      throw notFound();
    }

    const { user, ...objektList } = objektListWithUser;
    // if the user has a cosmo linked, redirect to the profile page
    const cosmo = user.cosmoAccount?.username;
    if (cosmo !== undefined) {
      throw redirect({
        to: "/@{$username}/list/$slug",
        params: { username: cosmo, slug: objektList.slug },
      });
    }

    const isAuthenticated = account?.user.id === objektList.userId;

    return {
      objektList,
      account,
      isAuthenticated,
      artists,
      selected,
    };
  },
  head: ({ loaderData }) => ({
    meta: [seoTitle(loaderData?.objektList.name ?? `Objekt List`)],
  }),
});

function RouteComponent() {
  const { account, artists, selected, isAuthenticated, objektList } =
    Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ArtistProvider artists={artists} selected={selected}>
          <ProfileProvider>
            <div className="grid grid-cols-2 grid-rows-2 lg:grid-rows-1 lg:h-9">
              <div className="flex items-center">
                <h3 className="text-xl font-cosmo leading-none">
                  {objektList.name}
                </h3>
              </div>

              <div className="lg:flex flex-row items-center justify-end gap-2 row-span-2 lg:row-span-1 grid grid-rows-subgrid">
                <span className="row-start-2 ml-auto" id="objekt-total" />
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <UpdateList objektList={objektList} />
                    <DeleteList objektList={objektList} />
                  </div>
                )}
              </div>

              <div
                className="h-10 flex items-center lg:hidden"
                id="filters-button"
              />
            </div>

            <ListRenderer
              authenticated={isAuthenticated}
              objektList={objektList}
            />
          </ProfileProvider>
        </ArtistProvider>
      </UserStateProvider>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex items-center h-9">
        <Skeleton className="rounded-full w-32 h-6" />
      </div>

      {/* content */}
      <div className="flex flex-col">
        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
          <Skeleton className="w-[42px] h-[36px]" />
        </div>

        <div className="flex flex-col">
          <MemberFilterSkeleton />
        </div>
      </div>
    </main>
  );
}

function NotFoundComponent() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semibold">Objekt list not found</p>
    </main>
  );
}

function ErrorComponent() {
  return <Error message="Could not load objekt list" />;
}
