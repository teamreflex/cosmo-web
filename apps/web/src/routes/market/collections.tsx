import { Error } from "@/components/error-boundary";
import MarketHeader from "@/components/market/market-header";
import MarketNotice from "@/components/market/market-notice";
import MarketRenderer from "@/components/market/market-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import ObjektTotalSlot from "@/components/objekt/objekt-total-slot";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { displayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { marketQuery } from "@/lib/queries/market";
import { marketFrontendSchema } from "@/lib/universal/parsers";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/market/collections")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  validateSearch: marketFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    const [account, selected] = await Promise.all([
      context.queryClient.query({
        ...currentAccountQuery,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...selectedArtistsQuery,
        staleTime: "static",
      }),
    ]);

    void context.queryClient
      .infiniteQuery(
        marketQuery(deps.searchParams, selected, displayCurrency(account)),
      )
      .catch(noop);

    return { account };
  },
  head: () =>
    defineHead({ title: m.market_header(), canonical: "/market/collections" }),
});

function RouteComponent() {
  const { account } = Route.useLoaderData();

  return (
    <main className="relative flex w-full flex-col">
      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <MetadataDialogProvider>
          <ProfileProvider objektLists={account?.objektLists ?? []}>
            <MarketRenderer />
          </ProfileProvider>
        </MetadataDialogProvider>
      </UserStateProvider>

      <Overlay>
        <ScrollToTop />
        <ToggleObjektBands />
      </Overlay>

      <MarketNotice />
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.error_could_not_load_objekts()} />;
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <MarketHeader
        total={<ObjektTotalSlot />}
        actions={
          <>
            <Skeleton className="size-9 md:h-8 md:w-28" />
            <Skeleton className="h-8 w-28" />
          </>
        }
      >
        <MemberFilterSkeleton />
      </MarketHeader>

      <div className="border-b border-border bg-muted/40">
        <div className="container flex flex-wrap items-center gap-2 py-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>

      <div className="container">
        <ObjektGridSkeleton gridColumns={5} />
      </div>
    </div>
  );
}
