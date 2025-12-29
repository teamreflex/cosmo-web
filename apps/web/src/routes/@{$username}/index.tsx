import { Error } from "@/components/error-boundary";
import ProfileRenderer from "@/components/profile/profile-renderer";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileProvider } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import {
  userCollectionBlockchainGroupsQuery,
  userCollectionBlockchainQuery,
} from "@/lib/queries/objekt-queries";
import { pinsQuery } from "@/lib/queries/profile";
import { userCollectionFrontendSchema } from "@/lib/universal/parsers";
import { Addresses, isEqual } from "@apollo/util";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/")({
  validateSearch: userCollectionFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  loader: async ({ context, params, deps }) => {
    void context.queryClient.prefetchQuery(filterDataQuery);

    const [account, target, pins, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(pinsQuery(params.username)),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    // if the user is in collection groups mode, prefetch the collection groups
    if (
      account?.user.collectionMode === "blockchain-groups" &&
      !isEqual(target.cosmo.address, Addresses.SPIN)
    ) {
      void context.queryClient.prefetchInfiniteQuery(
        userCollectionBlockchainGroupsQuery(
          target.cosmo.address,
          deps.searchParams,
          selected,
        ),
      );
    } else {
      // if the user is a guest or is in blockchain mode, prefetch the objekts
      void context.queryClient.prefetchInfiniteQuery(
        userCollectionBlockchainQuery(
          target.cosmo.address,
          deps.searchParams,
          selected,
        ),
      );
    }

    return { target, pins };
  },
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.target.cosmo.username
        ? m.collection_title_with_username({
            username: loaderData.target.cosmo.username,
          })
        : m.collection_title(),
      canonical: `/@${loaderData?.target.cosmo.username}`,
    }),
});

function RouteComponent() {
  const { target, pins } = Route.useLoaderData();

  return (
    <ProfileProvider
      key={target.cosmo.address}
      target={target}
      pins={target.user ? pins : []}
      lockedObjekts={target.user ? target.lockedObjekts : []}
      objektLists={target.objektLists}
    >
      <section className="flex flex-col">
        <ProfileRenderer targetCosmo={target.cosmo} />
      </section>
    </ProfileProvider>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      {/* FiltersContainer */}
      <div className="flex flex-col gap-2 pb-1 sm:pb-2">
        <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
          <Skeleton className="h-[36px] w-[42px]" />
        </div>
      </div>

      <MemberFilterSkeleton />
    </div>
  );
}

function ErrorComponent() {
  return <Error message={m.error_loading_user()} />;
}
