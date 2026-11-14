import { Error } from "@/components/error-boundary";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import ObjektTotalSlot from "@/components/objekt/objekt-total-slot";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { objektIndexBlockchainQuery } from "@/lib/queries/objekt-queries";
import { objektIndexFrontendSchema } from "@/lib/universal/parsers";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { noop } from "@tanstack/react-query";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  validateSearch: objektIndexFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search: { id, serial, ...searchParams } }) => ({
    searchParams,
  }),
  loader: async ({ context, deps }) => {
    // the objekts start loading once the selected artists are known, without waiting on the account
    const selected = await context.queryClient.query({
      ...selectedArtistsQuery,
      staleTime: "static",
    });
    if (!deps.searchParams.search) {
      void context.queryClient
        .infiniteQuery(objektIndexBlockchainQuery(deps.searchParams, selected))
        .catch(noop);
    }

    const account = await context.queryClient.query({
      ...currentAccountQuery,
      staleTime: "static",
    });

    return { account };
  },
  head: () => defineHead({ title: "Objekts", canonical: "/" }),
});

function RouteComponent() {
  const { account } = useLoaderData({ from: "/" });

  return (
    <main className="relative flex w-full flex-col">
      <MetadataDialogProvider>
        <IndexRenderer objektLists={account?.objektLists ?? []} />
      </MetadataDialogProvider>

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
      <TitleHeader title={m.objekts_header()} total={<ObjektTotalSlot />}>
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
