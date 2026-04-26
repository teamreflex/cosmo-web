import { Error } from "@/components/error-boundary";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import { objektIndexBlockchainQuery } from "@/lib/queries/objekt-queries";
import { objektIndexFrontendSchema } from "@/lib/universal/parsers";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  validateSearch: objektIndexFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    // prefetch filter data
    void context.queryClient.prefetchQuery(filterDataQuery);

    // load required data
    const [account, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
      context.queryClient.ensureQueryData(artistsQuery),
    ]);

    // prefetch objekts
    if (!deps.searchParams.search) {
      // prefetch blockchain
      void context.queryClient.prefetchInfiniteQuery(
        objektIndexBlockchainQuery(deps.searchParams, selected),
      );
    }

    return { account };
  },
  head: () => defineHead({ title: "Objekts", canonical: "/" }),
});

function RouteComponent() {
  const { account } = Route.useLoaderData();

  return (
    <main className="relative flex w-full flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider objektLists={account?.objektLists ?? []}>
          <IndexRenderer objektLists={account?.objektLists ?? []} />
        </ProfileProvider>
      </UserStateProvider>

      <Overlay>
        <ScrollToTop />
        <ToggleObjektBands />
      </Overlay>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.error_could_not_load_objekts()} />;
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      {/* Title */}
      <div className="border-b border-border">
        <div className="container grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
          <h1 className="font-cosmo text-2xl leading-none font-black tracking-wide uppercase md:text-3xl">
            {m.objekts_header()}
          </h1>
          <div className="flex justify-center">
            <MemberFilterSkeleton />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* FiltersContainer */}
      <div className="border-b border-border bg-muted/40">
        <div className="container flex flex-wrap items-center gap-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
          <Skeleton className="h-9 w-48" />
        </div>
      </div>

      <div className="container">
        <ObjektGridSkeleton gridColumns={5} />
      </div>
    </div>
  );
}
