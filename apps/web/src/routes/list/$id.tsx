import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { IconHeartBroken } from "@tabler/icons-react";
import { Error } from "@/components/error-boundary";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { $getObjektListWithUser } from "@/lib/server/objekts/lists";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ProfileProvider } from "@/hooks/use-profile";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";
import ListRenderer from "@/components/lists/list-renderer";
import { sanitizeUuid } from "@/lib/utils";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/list/$id")({
  staleTime: 1000 * 60 * 15, // 15 minutes
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
    const [objektListWithUser, account] = await Promise.all([
      $getObjektListWithUser({ data: { id: sanitizedId } }),
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(artistsQuery),
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
    };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.objektList.name ?? m.objekt_list(),
      canonical: `/list/${loaderData?.objektList.id}`,
    }),
});

function RouteComponent() {
  const { account, isAuthenticated, objektList } = Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider>
          <div className="grid grid-cols-2 grid-rows-2 lg:h-9 lg:grid-rows-1">
            <div className="flex items-center">
              <h3 className="font-cosmo text-xl leading-none">
                {objektList.name}
              </h3>
            </div>

            <div className="row-span-2 grid grid-rows-subgrid flex-row items-center justify-end gap-2 lg:row-span-1 lg:flex">
              <span className="row-start-2 ml-auto" id="objekt-total" />
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <UpdateList objektList={objektList} />
                  <DeleteList objektList={objektList} />
                </div>
              )}
            </div>

            <div
              className="flex h-10 items-center lg:hidden"
              id="filters-button"
            />
          </div>

          <ListRenderer
            authenticated={isAuthenticated}
            objektList={objektList}
          />
        </ProfileProvider>
      </UserStateProvider>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex h-9 items-center">
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* content */}
      <div className="flex flex-col">
        {/* filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 transition-all group-data-[show=false]:invisible group-data-[show=false]:h-0 group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:visible sm:group-data-[show=false]:h-12 sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:visible sm:group-data-[show=true]:h-12 sm:group-data-[show=true]:opacity-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
          <Skeleton className="h-[36px] w-[42px]" />
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
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.list_not_found()}</p>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.list_error_loading()} />;
}
