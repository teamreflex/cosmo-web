import { Error } from "@/components/error-boundary";
import WatchlistRenderer from "@/components/market/watchlist-renderer";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import ObjektTotalSlot from "@/components/objekt/objekt-total-slot";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import TitleHeader from "@/components/ui/title-header";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { watchedSlugsQuery, watchlistQuery } from "@/lib/queries/watchlist";
import { watchlistFrontendSchema } from "@/lib/universal/parsers";
import { MetadataDialogProvider } from "@/providers/metadata-dialog-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { UserStateProvider } from "@/providers/user-state-provider";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/market/watchlist")({
  validateSearch: watchlistFrontendSchema,
  beforeLoad: async ({ context }) => {
    const account =
      await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!account) {
      throw redirect({ to: "/market" });
    }
    return { account };
  },
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: PendingComponent,
  loaderDeps: ({ search }) => ({ searchParams: search }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(watchedSlugsQuery);
    void context.queryClient.prefetchInfiniteQuery(
      watchlistQuery(deps.searchParams),
    );
    return { account: context.account };
  },
  head: () =>
    defineHead({ title: m.watchlist_header(), canonical: "/market/watchlist" }),
});

function RouteComponent() {
  const { account } = Route.useLoaderData();

  return (
    <main className="relative flex w-full flex-col">
      <UserStateProvider user={account.user} cosmo={account.cosmo}>
        <MetadataDialogProvider>
          <ProfileProvider objektLists={account.objektLists}>
            <WatchlistRenderer />
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
      <TitleHeader title={m.watchlist_header()} total={<ObjektTotalSlot />}>
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
