import type { EventsFilters } from "@/hooks/use-events-filters";
import {
  $fetchActiveEvents,
  $fetchCollectionsForEvent,
  $fetchEras,
  $fetchErasForFilter,
  $fetchEventBySlug,
  $fetchEventObjekts,
  $fetchEvents,
  $fetchPaginatedEvents,
  $getSpotifyAlbum,
} from "@/lib/functions/events";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

export function adminErasQuery() {
  return queryOptions({
    queryKey: ["admin", "eras"],
    queryFn: () => $fetchEras(),
  });
}

export function adminEventsQuery() {
  return queryOptions({
    queryKey: ["admin", "events"],
    queryFn: () => $fetchEvents(),
  });
}

export function adminEventCollectionsQuery(eventId: string) {
  return queryOptions({
    queryKey: ["event-collections", eventId],
    queryFn: () => $fetchCollectionsForEvent({ data: { eventId } }),
  });
}

export function eventBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["event", slug],
    queryFn: () => $fetchEventBySlug({ data: { slug } }),
  });
}

export function spotifyAlbumQuery(albumId: string) {
  return queryOptions({
    queryKey: ["spotify-album", albumId],
    queryFn: () => $getSpotifyAlbum({ data: { albumId } }),
    staleTime: 1000 * 60 * 60, // 1 hour - album data rarely changes
  });
}

export function eventObjektsQuery(eventSlug: string) {
  return infiniteQueryOptions({
    queryKey: ["event-objekts", eventSlug],
    queryFn: ({ pageParam }) =>
      $fetchEventObjekts({ data: { eventSlug, cursor: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}

export const erasForFilterQuery = queryOptions({
  queryKey: ["eras", "filter"],
  queryFn: () => $fetchErasForFilter(),
  staleTime: 1000 * 60 * 60, // 1 hour
});

type PaginatedEventsQueryParams = {
  artists?: string[];
  filters?: Omit<EventsFilters, "artist">;
};

export function paginatedEventsQuery({
  artists,
  filters,
}: PaginatedEventsQueryParams) {
  return infiniteQueryOptions({
    queryKey: ["events", "paginated", artists, filters],
    queryFn: ({ pageParam }) =>
      $fetchPaginatedEvents({
        data: {
          artists,
          cursor: pageParam,
          sort: filters?.sort,
          era: filters?.era,
          season: filters?.season,
          eventType: filters?.type,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
  });
}

export function activeEventsQuery(artists?: string[]) {
  return queryOptions({
    queryKey: ["events", "active", artists],
    queryFn: () => $fetchActiveEvents({ data: { artists } }),
  });
}
