import { createFileRoute } from "@tanstack/react-router";
import { IconAlertCircle, IconBrandTwitter } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <main className="container flex flex-col gap-4 py-2">
      {/* header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-cosmo text-3xl uppercase">{event.name}</h1>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>

          {event.era.spotifyAlbumArt && (
            <img
              src={event.era.spotifyAlbumArt}
              alt={event.era.name}
              className="size-16 shrink-0 rounded-lg"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{event.eventType}</Badge>
          {event.era.name && <Badge variant="outline">{event.era.name}</Badge>}
          {event.twitterUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={event.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconBrandTwitter className="size-4" />
                {m.event_announcement()}
              </a>
            </Button>
          )}

          <div id="objekt-total" className="ml-auto" />
        </div>
      </div>

      <UserStateProvider user={account?.user} cosmo={account?.cosmo}>
        <ProfileProvider>
          <EventRenderer slug={event.slug} />
        </ProfileProvider>
      </UserStateProvider>
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
    <main className="container flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="relative grid grid-cols-3 gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        <SkeletonGradient />
        {Array.from({ length: 16 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-photocard w-full rounded-xl shadow-sm"
          />
        ))}
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
