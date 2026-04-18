import { Error } from "@/components/error-boundary";
import ListHeader from "@/components/lists/list-header";
import ListMatchesSheet from "@/components/lists/list-matches-sheet";
import ListRenderer from "@/components/lists/list-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { $fetchObjektList } from "@/lib/functions/lists";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { IconHeartBroken } from "@tabler/icons-react";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/list/$slug")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  validateSearch: objektListFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    void context.queryClient.prefetchQuery(filterDataQuery);

    const [account, target, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(artistsQuery),
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
    void context.queryClient.prefetchInfiniteQuery(
      objektListQuery(objektList.id, deps.searchParams, selected),
    );

    const isAuthenticated = account?.user.id === objektList.userId;
    const { objektLists, ...targetAccount } = target;

    return {
      account,
      target: targetAccount,
      targetObjektLists: objektLists,
      isAuthenticated,
      objektList,
    };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.objektList.name ?? m.objekt_list(),
      canonical: `/@${loaderData?.target.cosmo.username}/list/${loaderData?.objektList.id}`,
    }),
});

function RouteComponent() {
  const { account, target, targetObjektLists, isAuthenticated, objektList } =
    Route.useLoaderData();

  // a list is trade-active if it's a have list with a linked want, OR a want
  // list that some have list of the same user links to
  const linkingHave =
    objektList.type === "want"
      ? targetObjektLists.find(
          (l) => l.type === "have" && l.linkedWantListId === objektList.id,
        )
      : undefined;
  const isTradeActive =
    objektList.type === "have"
      ? objektList.linkedWantListId !== null
      : linkingHave !== undefined;

  const extras =
    isAuthenticated &&
    isTradeActive &&
    (objektList.type === "have" || objektList.type === "want") ? (
      <ListMatchesSheet listId={objektList.id} listType={objektList.type} />
    ) : null;

  return (
    <UserStateProvider {...account}>
      <ProfileProvider target={target} objektLists={targetObjektLists}>
        <div className="border-b border-border">
          <div className="container">
            <ListHeader
              list={objektList}
              ownerName={target.cosmo.username}
              objektCount={0}
              isOwner={isAuthenticated}
              extras={extras}
            />
          </div>
        </div>

        <ListRenderer objektList={objektList} authenticated={isAuthenticated} />

        <Overlay>
          <ScrollToTop />
          <ToggleObjektBands />
        </Overlay>
      </ProfileProvider>
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
      <IconHeartBroken className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.list_not_found()}</p>
    </main>
  );
}
