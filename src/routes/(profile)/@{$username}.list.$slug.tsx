import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { HeartCrack } from "lucide-react";
import { Error } from "@/components/error-boundary";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { $fetchObjektList } from "@/lib/server/objekts/lists";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import UpdateList from "@/components/lists/update-list";
import DeleteList from "@/components/lists/delete-list";
import ListRenderer from "@/components/lists/list-renderer";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/(profile)/@{$username}/list/$slug")({
  staleTime: 1000 * 60 * 15, // 15 minutes
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
    const objektList = await $fetchObjektList({
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
      objektListQuery(objektList.id, deps.searchParams, selected),
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
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.objektList.name ?? m.objekt_list(),
      canonical: `/@${loaderData?.target.user?.username}/list/${loaderData?.objektList.id}`,
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
            <h3 className="font-cosmo text-xl">{objektList.name}</h3>

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
      <div className="group flex flex-col" data-show={false}>
        {/* title */}
        <div className="flex h-10 items-center">
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 transition-all group-data-[show=false]:invisible group-data-[show=false]:h-0 group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:visible sm:group-data-[show=false]:h-12 sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:visible sm:group-data-[show=true]:h-12 sm:group-data-[show=true]:opacity-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
          <Skeleton className="h-[36px] w-[42px]" />
        </div>
      </div>

      <div className="flex flex-col">
        <MemberFilterSkeleton />
      </div>
    </div>
  );
}

function ErrorComponent() {
  return <Error message={m.list_error_loading()} />;
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <HeartCrack className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.list_not_found()}</p>
    </main>
  );
}
