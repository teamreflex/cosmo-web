import FiltersContainer from "@/components/collection/filters-container";
import { Error } from "@/components/error-boundary";
import ListHeader, { ListHeaderSkeleton } from "@/components/lists/list-header";
import ListMatches from "@/components/lists/list-matches";
import ListRenderer from "@/components/lists/list-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
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
import { IconArrowsExchange, IconHeartBroken } from "@tabler/icons-react";
import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from "@tanstack/react-router";

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

  const pairedList =
    objektList.type === "have" && objektList.linkedWantListId
      ? targetObjektLists.find((l) => l.id === objektList.linkedWantListId)
      : linkingHave;

  const extras = (
    <>
      {pairedList && (
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/@{$username}/list/$slug"
            params={{
              username: target.cosmo.username,
              slug: pairedList.slug,
            }}
          >
            <IconArrowsExchange />
            <span>{m.list_header_paired()}</span>
          </Link>
        </Button>
      )}
      {isAuthenticated &&
        isTradeActive &&
        (objektList.type === "have" || objektList.type === "want") && (
          <ListMatches list={objektList} />
        )}
    </>
  );

  return (
    <UserStateProvider {...account}>
      <ProfileProvider target={target} objektLists={targetObjektLists}>
        <div className="border-b border-border">
          <div className="container">
            <ListHeader
              list={objektList}
              ownerName={target.cosmo.username}
              owner={target.user}
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
      <div className="border-b border-border">
        <div className="container">
          <ListHeaderSkeleton />
        </div>
      </div>

      <div className="flex flex-col">
        <TitleHeader title={m.list_title()}>
          <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
            <div className="md:pointer-events-auto">
              <MemberFilterSkeleton />
            </div>
          </div>
        </TitleHeader>

        <FiltersContainer>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        </FiltersContainer>
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
