import { createFileRoute } from "@tanstack/react-router";
import { userCollectionFrontendSchema } from "@/lib/universal/parsers";
import { Skeleton } from "@/components/ui/skeleton";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Error } from "@/components/error-boundary";
import { seoTitle } from "@/lib/seo";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
  targetAccountQuery,
} from "@/lib/queries/core";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { pinsQuery } from "@/lib/queries/profile";
import { Addresses, isEqual } from "@/lib/utils";
import {
  userCollectionBlockchainGroupsQuery,
  userCollectionBlockchainQuery,
} from "@/lib/queries/objekt-queries";

export const Route = createFileRoute("/(profile)/@{$username}/")({
  validateSearch: userCollectionFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  loader: async ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(filterDataQuery);

    const [artists, selected, account, target, pins] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(targetAccountQuery(params.username)),
      context.queryClient.ensureQueryData(pinsQuery(params.username)),
    ]);

    // if the user is in collection groups mode, prefetch the collection groups
    if (
      account?.user.collectionMode === "blockchain-groups" &&
      !isEqual(target.cosmo.address, Addresses.SPIN)
    ) {
      context.queryClient.prefetchInfiniteQuery(
        userCollectionBlockchainGroupsQuery(
          target.cosmo.address,
          deps.searchParams,
          selected,
        ),
      );
    } else {
      // if the user is a guest or is in blockchain mode, prefetch the objekts
      context.queryClient.prefetchInfiniteQuery(
        userCollectionBlockchainQuery(
          target.cosmo.address,
          deps.searchParams,
          selected,
        ),
      );
    }

    return { artists, selected, account, target, pins };
  },
  head: ({ loaderData }) => ({
    meta: [
      seoTitle(
        loaderData?.target.user
          ? `${loaderData.target.user.username}'s Collection`
          : `Collection`,
      ),
    ],
  }),
});

function RouteComponent() {
  const { artists, selected, account, target, pins } = Route.useLoaderData();

  return (
    <UserStateProvider {...account}>
      <ArtistProvider artists={artists} selected={selected}>
        <ProfileProvider
          target={target}
          pins={target.user ? pins : []}
          lockedObjekts={target.user ? target.lockedObjekts : []}
          objektLists={target.objektLists}
        >
          <section className="flex flex-col">
            <ProfileRenderer targetCosmo={target.cosmo} />
          </section>
        </ProfileProvider>
      </ArtistProvider>
    </UserStateProvider>
  );
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      {/* FiltersContainer */}
      <div className="flex flex-col gap-2 sm:pb-2 pb-1">
        <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
          <Skeleton className="w-[42px] h-[36px]" />
        </div>
      </div>

      <MemberFilterSkeleton />
    </div>
  );
}

function ErrorComponent() {
  return <Error message="Could not load user" />;
}
