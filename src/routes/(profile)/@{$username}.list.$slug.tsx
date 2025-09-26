import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { HeartCrack } from "lucide-react";
import { Error } from "@/components/error-boundary";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { seoTitle } from "@/lib/seo";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/queries";
import { fetchObjektList } from "@/lib/server/objekts/lists";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";
import ListRenderer from "@/components/lists/list-renderer";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import { objektListQuery } from "@/lib/universal/objekt-queries";

export const Route = createFileRoute("/(profile)/@{$username}/list/$slug")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  validateSearch: objektListFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(filterDataQuery);

    const [artists, selected, account, target] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
    ]);

    // user not found
    if (target.user === undefined) {
      throw notFound();
    }

    // find objekt list
    const objektList = await fetchObjektList({
      data: {
        userId: target.user.id,
        slug: params.slug,
      },
    });

    if (!objektList) {
      throw redirect({
        to: "/@{$username}",
        params: { username: params.username },
      });
    }

    // fetch entries
    context.queryClient.prefetchInfiniteQuery(
      objektListQuery(objektList.id, deps.searchParams, selected)
    );

    const isAuthenticated = account?.user.id === objektList.userId;
    const { objektLists, ...targetAccount } = target;

    return {
      account,
      target: targetAccount,
      targetObjektLists: objektLists,
      artists,
      selected,
      isAuthenticated,
      objektList,
    };
  },
  head: ({ loaderData }) => ({
    meta: [seoTitle(loaderData?.objektList.name ?? `Objekt List`)],
  }),
});

function RouteComponent() {
  const {
    account,
    target,
    targetObjektLists,
    artists,
    selected,
    isAuthenticated,
    objektList,
  } = Route.useLoaderData();

  return (
    <UserStateProvider {...account}>
      <ArtistProvider artists={artists} selected={selected}>
        <ProfileProvider target={target} objektLists={targetObjektLists}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-cosmo">{objektList.name}</h3>

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <UpdateList objektList={objektList} />
                <DeleteList objektList={objektList} />
              </div>
            )}
          </div>

          <ListRenderer
            objektList={objektList}
            authenticated={isAuthenticated}
          />
        </ProfileProvider>
      </ArtistProvider>
    </UserStateProvider>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col group" data-show={false}>
        {/* title */}
        <div className="flex items-center h-10">
          <Skeleton className="rounded-full w-32 h-6" />
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
          <Skeleton className="w-[42px] h-[36px]" />
        </div>
      </div>

      <div className="flex flex-col">
        <MemberFilterSkeleton />
      </div>
    </div>
  );
}

function ErrorComponent() {
  return <Error message="Could not load objekt list" />;
}

function NotFoundComponent() {
  return (
    <main className="container flex flex-col w-full gap-2 items-center justify-center py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semibold">Objekt list not found</p>
    </main>
  );
}
