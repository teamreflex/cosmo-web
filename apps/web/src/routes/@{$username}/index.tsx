import FiltersContainer from "@/components/collection/filters-container";
import { Error } from "@/components/error-boundary";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import ProfileRenderer from "@/components/profile/profile-renderer";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
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
import { ProfileProvider } from "@/providers/profile-provider";
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

      <Overlay>
        <ScrollToTop />
        <ToggleObjektBands />
      </Overlay>
    </ProfileProvider>
  );
}

function PendingComponent() {
  return (
    <div className="relative flex flex-col">
      <TitleHeader title={m.collection_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilterSkeleton />
          </div>
        </div>
      </TitleHeader>

      <FiltersContainer>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </FiltersContainer>
    </div>
  );
}

function ErrorComponent() {
  return <Error message={m.error_loading_user()} />;
}
