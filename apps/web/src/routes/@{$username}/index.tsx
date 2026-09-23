import FiltersContainer from "@/components/collection/filters-container";
import { Error } from "@/components/error-boundary";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import BatchSelectionBar from "@/components/profile/batch-selection-bar";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import {
  userCollectionBlockchainGroupsQuery,
  userCollectionBlockchainQuery,
} from "@/lib/queries/objekt-queries";
import { pinsQuery } from "@/lib/queries/profile";
import { profileIdentifier } from "@/lib/universal/cosmo-accounts";
import { userCollectionFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { Addresses, isEqual } from "@apollo/util";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@{$username}/")({
  validateSearch: userCollectionFrontendSchema,
  loaderDeps: ({ search: { serial, locked, binder, ...searchParams } }) => ({
    searchParams,
  }),
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  // shared with use-pin-reorder, which writes into the same cache entry
  context: ({ params }) => ({
    pinsOptions: pinsQuery(params.username),
  }),
  loader: async ({ context, deps }) => {
    const [account, target, pins, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(context.targetAccountOptions),
      context.queryClient.ensureQueryData(context.pinsOptions),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    // serial sorts only exist on the blockchain data source, so the component
    // falls back to it regardless of collection mode (see use-filters.ts)
    const useBlockchain =
      deps.searchParams.sort === "serialAsc" ||
      deps.searchParams.sort === "serialDesc";

    // if the user is in collection groups mode, prefetch the collection groups
    if (
      !useBlockchain &&
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
      canonical:
        loaderData && `/@${profileIdentifier(loaderData.target.cosmo)}`,
    }),
});

function RouteComponent() {
  const { target, pins } = Route.useLoaderData();
  // list actions only ever run on the viewer's own profile, so they read the viewer's lists
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const objektLists = account?.objektLists ?? [];

  return (
    <ProfileProvider
      key={target.cosmo.address}
      target={target}
      pins={target.user ? pins : []}
      lockedObjekts={target.user ? target.lockedObjekts : []}
      objektLists={objektLists}
    >
      <section className="flex flex-col">
        <ProfileRenderer targetCosmo={target.cosmo} />
      </section>

      <Overlay>
        <ScrollToTop />
        <ToggleObjektBands />
      </Overlay>

      <BatchSelectionBar objektLists={objektLists} />
    </ProfileProvider>
  );
}

function PendingComponent() {
  return (
    <div className="relative flex flex-col">
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
