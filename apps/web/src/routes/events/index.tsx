import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { IconCalendarEvent } from "@tabler/icons-react";
import type { Era, EventWithEra } from "@apollo/database/web/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Error } from "@/components/error-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timestamp } from "@/components/ui/timestamp";
import { erasQuery, eventsQuery } from "@/lib/queries/events";
import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/events/")({
  loader: async ({ context }) => {
    const [{ artists }, events, eras] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(eventsQuery()),
      context.queryClient.ensureQueryData(erasQuery()),
      context.queryClient.ensureQueryData(selectedArtistsQuery),
    ]);

    return { events, eras, artists };
  },
  staleTime: 1000 * 60 * 15, // 15 minutes
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  head: () => defineHead({ title: m.events_header(), canonical: "/events" }),
});

function RouteComponent() {
  const { data: selected, dataUpdatedAt } =
    useSuspenseQuery(selectedArtistsQuery);
  const { events, eras, artists } = Route.useLoaderData();

  const artistList = Object.values(artists).sort(
    (a, b) => a.comoTokenId - b.comoTokenId,
  );
  const toRender =
    selected.length > 0
      ? artistList.filter((a) => selected.includes(a.id))
      : artistList;

  return (
    <main className="container flex flex-col py-2">
      <Tabs defaultValue={toRender[0]?.id} key={dataUpdatedAt}>
        {/* header */}
        <div className="flex flex-row items-center justify-between">
          <h1 className="font-cosmo text-3xl uppercase">{m.events_header()}</h1>

          <TabsList>
            {toRender.map((artist) => (
              <TabsTrigger key={artist.id} value={artist.id} className="gap-2">
                <img
                  className="aspect-square size-5 shrink-0 rounded-full"
                  src={artist.logoImageUrl}
                  alt={artist.title}
                />
                {artist.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {toRender.map((artist) => {
          const artistEvents = events.filter((e) => e.artist === artist.id);
          const artistEras = eras.filter((e) => e.artist === artist.id);

          return (
            <TabsContent
              key={artist.id}
              value={artist.id}
              className="grid grid-cols-1 gap-2 data-[state=inactive]:hidden md:grid-cols-2 xl:grid-cols-3"
              forceMount
            >
              {artistEvents.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted-foreground">
                  {m.events_no_events()}
                </p>
              ) : (
                artistEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    era={artistEras.find((e) => e.id === event.eraId)}
                  />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}

type EventCardProps = {
  event: EventWithEra;
  era?: Era;
};

function EventCard({ event, era }: EventCardProps) {
  return (
    <Link to="/events/$slug" params={{ slug: event.slug }}>
      <Card className="group relative overflow-clip transition-colors hover:border-foreground/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold leading-tight">{event.name}</h3>
              {event.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>

            {era?.spotifyAlbumArt && (
              <img
                src={era.spotifyAlbumArt}
                alt={era.name}
                className="size-12 shrink-0 rounded"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <IconCalendarEvent className="size-4 shrink-0 text-muted-foreground" />
            <Timestamp
              className="text-sm text-muted-foreground"
              date={new Date(event.createdAt)}
              format="PPP"
            />

            <Badge variant="secondary" className="ml-auto">
              {event.eventType}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex flex-row items-center justify-between">
        <h1 className="font-cosmo text-3xl uppercase">{m.events_header()}</h1>
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      <div className="relative mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonGradient />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl shadow-sm" />
        ))}
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.events_error_loading()} />;
}
