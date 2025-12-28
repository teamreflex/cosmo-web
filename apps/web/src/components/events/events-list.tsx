import { Link } from "@tanstack/react-router";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { IconCalendarEvent } from "@tabler/icons-react";
import type { EventWithEra } from "@apollo/database/web/types";
import EventTypeBadge from "@/components/events/event-type-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timestamp } from "@/components/ui/timestamp";
import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { paginatedEventsQuery } from "@/lib/queries/events";
import { m } from "@/i18n/messages";

type EventsListProps = {
  selectedArtists: string[] | undefined;
  onHoverChange: (event: EventWithEra | null) => void;
};

export default function EventsList({
  selectedArtists,
  onHoverChange,
}: EventsListProps) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(paginatedEventsQuery(selectedArtists));

  const allEvents = data.pages.flatMap((page) => page.events);

  if (allEvents.length === 0) {
    return (
      <p className="col-span-full py-12 text-center text-muted-foreground">
        {m.events_no_events()}
      </p>
    );
  }

  return (
    <>
      {/* events grid */}
      <div className="relative z-10 mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {allEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onMouseEnter={() => onHoverChange(event)}
          />
        ))}
      </div>

      {/* pagination trigger */}
      <InfiniteQueryNext
        status="success"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

type EventCardProps = {
  event: EventWithEra;
  onMouseEnter?: () => void;
};

function EventCard(props: EventCardProps) {
  const imageUrl =
    props.event.imageUrl ||
    props.event.era.imageUrl ||
    props.event.era.spotifyAlbumArt;

  return (
    <Link
      to="/events/$slug"
      params={{ slug: props.event.slug }}
      onMouseEnter={props.onMouseEnter}
    >
      <Card className="group relative overflow-clip transition-colors hover:border-foreground/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className="leading-tight font-semibold">
                {props.event.name}
              </h3>
              {props.event.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {props.event.description}
                </p>
              )}
            </div>

            {imageUrl && (
              <img
                src={imageUrl}
                alt={props.event.name}
                className="size-12 shrink-0 rounded"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <IconCalendarEvent className="size-4 shrink-0 text-muted-foreground" />
            <Timestamp
              className="text-sm text-muted-foreground"
              date={new Date(props.event.createdAt)}
              format="PPP"
            />

            <EventTypeBadge
              eventType={props.event.eventType}
              className="ml-auto"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
