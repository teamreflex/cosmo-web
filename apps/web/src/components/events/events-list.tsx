import EventTypeBadge from "@/components/events/event-type-badge";
import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "@/components/ui/timestamp";
import { getSeasonKeys } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { paginatedEventsQuery } from "@/lib/queries/events";
import type { EventWithEra } from "@apollo/database/web/types";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

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
      <p className="relative z-20 col-span-full mt-4 rounded-lg border border-dashed border-accent bg-background/60 py-12 text-center text-muted-foreground backdrop-blur-md md:mx-auto md:w-1/2">
        {m.events_no_events()}
      </p>
    );
  }

  return (
    <>
      {/* events list */}
      <div className="relative z-20 mt-4 flex flex-col overflow-hidden rounded-lg border border-accent bg-background/60 text-sm backdrop-blur-md md:grid md:grid-cols-[auto_1fr_auto_auto_auto]">
        {allEvents.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            onPointerEnter={() => onHoverChange(event)}
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

type EventRowProps = {
  event: EventWithEra;
  onPointerEnter?: () => void;
};

function EventRow({ event, onPointerEnter }: EventRowProps) {
  const imageUrl =
    event.imageUrl || event.era.imageUrl || event.era.spotifyAlbumArt;
  const eraImageUrl = event.era.imageUrl || event.era.spotifyAlbumArt;

  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onPointerEnter?.()}
      className="flex flex-col gap-2 border-b border-accent p-3 transition-colors last:border-b-0 hover:bg-secondary/40 md:col-span-full md:grid md:grid-cols-subgrid md:items-center md:gap-4 md:px-4 md:py-2"
    >
      {/* Mobile: Row 1 / Desktop: Columns 1-2 */}
      <div className="flex items-start gap-3 md:contents">
        {/* Image thumbnail */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.name}
            className="size-10 shrink-0 rounded md:size-12"
          />
        ) : (
          <div className="hidden size-12 md:block" />
        )}

        {/* Name + Description */}
        <div className="flex min-w-0 flex-col">
          <span className="leading-tight font-semibold">{event.name}</span>
          {event.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* Mobile: Row 2 / Desktop: Column 3 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconCalendarEvent className="size-4" />
        <div className="flex gap-1">
          {event.startDate && (
            <Timestamp date={event.startDate} format="MMM d, yyyy" />
          )}
          {event.startDate && <span>~</span>}
          {event.endDate ? (
            <Timestamp date={event.endDate} format="MMM d, yyyy" />
          ) : (
            <span className="italic">Present</span>
          )}
        </div>
      </div>

      {/* Mobile: Row 3 / Desktop: Columns 4-5 */}
      <div className="flex flex-wrap items-center gap-1.5 md:contents">
        {/* Type + Era badges (stacked on desktop) */}
        <div className="flex items-center gap-1.5 md:flex-col md:items-end">
          <EventTypeBadge eventType={event.eventType} />
          <Badge variant="event-era">
            {eraImageUrl && (
              <img
                src={eraImageUrl}
                alt={event.era.name}
                className="size-3.5 rounded-xs"
              />
            )}
            <span>{event.era.name}</span>
          </Badge>
        </div>

        {/* Season badges */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Seasons seasons={event.seasons} />
        </div>
      </div>
    </Link>
  );
}

function Seasons({ seasons }: { seasons: string[] }) {
  const seasonKeys = getSeasonKeys(seasons);

  return (
    <>
      {seasonKeys.map(({ key, name }) => (
        <Badge key={name} variant={`season-${key}` as "season-atom"}>
          {name}
        </Badge>
      ))}
    </>
  );
}
