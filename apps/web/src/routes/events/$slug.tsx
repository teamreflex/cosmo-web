import { createFileRoute } from "@tanstack/react-router";
import { IconAlertCircle } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Error as ErrorFallback } from "@/components/error-boundary";
import VirtualizedObjektGrid from "@/components/objekt/virtualized-objekt-grid";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { eventBySlugQuery, eventObjektsQuery } from "@/lib/queries/events";
import { defineHead } from "@/lib/meta";
import { env } from "@/lib/env/client";
import { m } from "@/i18n/messages";
import EventGridItem from "@/components/events/event-grid-item";
import EventHeader from "@/components/events/event-header";
import { UserStateProvider } from "@/hooks/use-user-state";
import { currentAccountQuery } from "@/lib/queries/core";
import { ProfileProvider } from "@/hooks/use-profile";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchInfiniteQuery(eventObjektsQuery(params.slug));

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
      <div className="container -mt-20 pb-4 md:-mt-56">
        <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
          <ProfileProvider>
            <EventRenderer slug={event.slug} />
          </ProfileProvider>
        </UserStateProvider>
      </div>
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
    <main>
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 px-4 py-8 md:px-8 md:py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
          <Skeleton className="size-48 shrink-0 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-64 md:h-14 md:w-96" />
            <Skeleton className="h-5 w-80 md:w-[32rem]" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container">
        <div className="relative grid grid-cols-3 gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          <SkeletonGradient />
          {Array.from({ length: 16 }).map((_, index) => (
            <Skeleton
              key={index}
              className="aspect-photocard w-full rounded-xl shadow-sm"
            />
          ))}
        </div>
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
