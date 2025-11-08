import { createFileRoute, notFound } from "@tanstack/react-router";
import { Addresses, isEqual } from "@apollo/util";
import { userCollectionFrontendSchema } from "@/lib/universal/parsers";
import { Skeleton } from "@/components/ui/skeleton";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Error } from "@/components/error-boundary";
import {
  artistsQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { UserStateProvider } from "@/hooks/use-user-state";
import { ArtistProvider } from "@/hooks/use-artists";
import { ProfileProvider } from "@/hooks/use-profile";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { pinsQuery } from "@/lib/queries/profile";
import {
  userCollectionBlockchainGroupsQuery,
  userCollectionBlockchainQuery,
} from "@/lib/queries/objekt-queries";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/@{$username}/")({
  validateSearch: userCollectionFrontendSchema,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  loader: async ({ context, params, deps, parentMatchPromise }) => {
    const now = performance.now();
    context.queryClient.prefetchQuery(filterDataQuery);

    const [layoutData, artists, selected, pins] = await Promise.all([
      parentMatchPromise.then((parent) => parent.loaderData),
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(pinsQuery(params.username)),
    ]);

    if (!layoutData) {
      throw notFound();
    }

    const { account, target } = layoutData;

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

    const end = performance.now();
    console.log(`Time taken: ${end - now} milliseconds`);

    return { artists, selected, account, target, pins };
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
