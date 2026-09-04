import { Error } from "@/components/error-boundary";
import MarketRenderer from "@/components/market/market-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { marketQuery } from "@/lib/queries/market";
import { marketFrontendSchema } from "@/lib/universal/parsers";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/market")({
  staleTime: 1000 * 60 * 15, // 15 minutes
  validateSearch: marketFrontendSchema,
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: async ({ context, deps }) => {
    const [account, selected] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    void context.queryClient.prefetchInfiniteQuery(
      marketQuery(deps.searchParams, selected),
    );

    return { account };
  },
  head: () => defineHead({ title: "Market", canonical: "/market" }),
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
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.error_could_not_load_objekts()} />;
}

function PendingComponent() {
  return (
    <div className="flex flex-col">
      <TitleHeader title={m.market_header()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <MemberFilterSkeleton />
          </div>
        </div>
      </TitleHeader>

      <div className="border-b border-border bg-muted/40">
        <div className="container flex flex-wrap items-center gap-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
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
