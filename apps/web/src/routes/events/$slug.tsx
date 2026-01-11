import { Error as ErrorFallback } from "@/components/error-boundary";
import EventGridItem from "@/components/events/event-grid-item";
import EventHeader from "@/components/events/event-header";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import ToggleObjektBands from "@/components/misc/overlay/toggle-objekt-bands";
import ObjektGridSkeleton from "@/components/objekt/objekt-grid-skeleton";
import VirtualizedObjektGrid from "@/components/objekt/virtualized-objekt-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { objektOptions } from "@/hooks/use-objekt-response";
import { ProfileProvider } from "@/hooks/use-profile";
import { UserStateProvider } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { eventBySlugQuery, eventObjektsQuery } from "@/lib/queries/events";
import { IconAlertCircle } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    void context.queryClient.prefetchInfiniteQuery(
      eventObjektsQuery(params.slug),
    );

    const [account, event] = await Promise.all([
      context.queryClient.ensureQueryData(currentAccountQuery),
      context.queryClient.ensureQueryData(eventBySlugQuery(params.slug)),
    ]);

    return { account, event };
  },
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  head: ({ loaderData }) =>
    defineHead({
      title: loaderData?.event.name ?? m.events_header(),
      canonical: `/events/${loaderData?.event.slug}`,
    }),
});

function RouteComponent() {
  const { account, event } = Route.useLoaderData();

  return (
    <main className="flex flex-col">
      {/* Header - full bleed */}
      <EventHeader event={event} />

      {/* Content - constrained */}
      <div className="container -mt-16 pb-4 md:-mt-42">
        <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
          <ProfileProvider>
            <EventRenderer slug={event.slug} />
          </ProfileProvider>
        </UserStateProvider>
      </div>

      <Overlay>
        <ScrollToTop />
        <ToggleObjektBands />
      </Overlay>
    </main>
  );
}

type EventRendererProps = {
  slug: string;
};

function EventRenderer(props: EventRendererProps) {
  const gridColumns = useGridColumns();

  const options = objektOptions({
    filtering: "remote",
    query: eventObjektsQuery(props.slug),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">
          {m.events_collections_count({ count: total })}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <VirtualizedObjektGrid
      options={options}
      gridColumns={gridColumns}
      getObjektId={(objekt) => objekt.slug}
      authenticated={false}
      ItemComponent={EventGridItem}
      showTotal
    />
  );
}

function PendingComponent() {
  return (
    <main className="flex flex-col">
      {/* EventHeader */}
      <div className="relative min-h-108 overflow-hidden md:min-h-120">
        {/* fade to background layer */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background to-transparent" />

        {/* inner content */}
        <div className="relative z-10 flex flex-col gap-4 px-4 py-8 md:container">
          <div className="flex max-h-32 flex-col gap-4 md:max-h-48 md:flex-row md:items-end md:gap-6">
            {/* event/era image */}
            <div className="mx-auto shrink-0 drop-shadow-2xl md:mx-0">
              <div className="aspect-square size-32 rounded-lg bg-muted shadow-2xl md:size-48" />
            </div>

            <div className="flex w-full flex-col gap-2 text-white drop-shadow-lg">
              <div className="flex items-center justify-between gap-2">
                {/* start/end dates */}
                <Skeleton className="h-4 w-24" />
              </div>

              {/* badges/info */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {/* event type */}
                <Skeleton className="h-4 w-8 rounded-full" />

                {/* event era */}
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>

              {/* title */}
              <div className="@container w-full overflow-hidden">
                <Skeleton className="h-[clamp(0.875rem,2cqw,3rem)] w-1/2 rounded-full md:h-[clamp(1.25rem,2.5cqw,3.5rem)]" />
              </div>

              {/* description */}
              <div className="flex h-14 flex-col gap-1 md:h-16">
                <Skeleton className="h-3 w-full md:h-4" />
                <Skeleton className="h-3 w-full md:h-4" />
                <Skeleton className="h-3 w-full md:h-4" />
                <Skeleton className="h-3 w-2/3 md:h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EventRenderer */}
      <div className="container -mt-20 pb-4 md:-mt-56">
        <ObjektGridSkeleton gridColumns={5} />
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <ErrorFallback message={m.events_error_loading()} />;
}

function NotFoundComponent() {
  return (
    <main className="container flex w-full flex-col items-center justify-center gap-2 py-12">
      <IconAlertCircle className="h-24 w-24" />
      <p className="text-sm font-semibold">{m.events_error_not_found()}</p>
      <p className="w-64 text-center text-sm text-balance">
        {m.error_not_found_description({ appName: env.VITE_APP_NAME })}
      </p>
    </main>
  );
}
