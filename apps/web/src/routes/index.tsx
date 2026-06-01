import { Error } from "@/components/error-boundary";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { objektIndexBlockchainQuery } from "@/lib/queries/objekt-queries";
import { objektIndexFrontendSchema } from "@/lib/universal/parsers";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
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
    const [account, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
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
        <MetadataDialogProvider>
          <ProfileProvider objektLists={account?.objektLists ?? []}>
            <IndexRenderer objektLists={account?.objektLists ?? []} />
          </ProfileProvider>
        </MetadataDialogProvider>
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
      <TitleHeader title={m.objekts_header()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilterSkeleton />
          </div>
        </div>
        <Skeleton className="ml-auto h-8 w-20" />
      </TitleHeader>

      {/* FiltersContainer */}
      <div className="border-b border-border bg-muted/40">
        <div className="container flex flex-wrap items-center gap-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
          <Skeleton className="h-8 w-48" />
        </div>
      </div>

      <div className="container">
        <ObjektGridSkeleton gridColumns={5} />
      </div>
    </div>
  );
}
