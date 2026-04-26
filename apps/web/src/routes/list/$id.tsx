import FiltersContainer from "@/components/collection/filters-container";
import { Error } from "@/components/error-boundary";
import ListHeader, { ListHeaderSkeleton } from "@/components/lists/list-header";
import ListRenderer from "@/components/lists/list-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { $getObjektListWithUser } from "@/lib/functions/lists";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { objektListFrontendSchema } from "@/lib/universal/parsers";
import { sanitizeUuid } from "@/lib/utils";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { IconHeartBroken } from "@tabler/icons-react";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/list/$id")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  component: RouteComponent,
  pendingComponent: PendingComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  validateSearch: objektListFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, params, deps }) => {
    void context.queryClient.prefetchQuery(filterDataQuery);

    // sanitize the id due to discord users accidentally appending formatting to the URL
    const sanitizedId = sanitizeUuid(params.id);
    if (!sanitizedId) {
      throw notFound();
    }

    // kick off loading of objekt list entries
    const selected =
      await context.queryClient.ensureQueryData(selectedArtistsQuery);
    void context.queryClient.prefetchInfiniteQuery(
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

    const { user, userDisplay, cosmoUsername, ...objektList } =
      objektListWithUser;
    // if the user has a cosmo linked, redirect to the profile page
    if (cosmoUsername !== undefined) {
      throw redirect({
        to: "/@{$username}/list/$slug",
        params: { username: cosmoUsername, slug: objektList.slug },
      });
    }

    const isAuthenticated = account?.user.id === objektList.userId;

    return {
      objektList,
      owner: {
        display: userDisplay,
        user,
      },
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
  const { account, isAuthenticated, objektList, owner } = Route.useLoaderData();

  return (
    <main className="flex flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider>
          <div className="border-b border-border">
            <div className="container">
              <ListHeader
                list={objektList}
                ownerName={owner.display}
                owner={owner.user}
                isOwner={isAuthenticated}
              />
            </div>
          </div>

          <ListRenderer
            authenticated={isAuthenticated}
            objektList={objektList}
          />

          <Overlay>
            <ScrollToTop />
            <ToggleObjektBands />
          </Overlay>
        </ProfileProvider>
      </UserStateProvider>
    </main>
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
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
