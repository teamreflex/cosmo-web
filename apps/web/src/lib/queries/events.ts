import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { $getSpotifyAlbum } from "@/lib/server/events/actions";
import {
  $fetchActiveEvents,
  $fetchCollectionsForEvent,
  $fetchEras,
  $fetchEventBySlug,
  $fetchEventObjekts,
  $fetchEvents,
  $fetchPaginatedEvents,
} from "@/lib/server/events/queries";

export function erasQuery(artist?: string) {
  return queryOptions({
    queryKey: ["eras", artist],
    queryFn: () => $fetchEras({ data: { artist } }),
  });
}

export function eventsQuery(options?: { artist?: string; eraId?: string }) {
  return queryOptions({
    queryKey: ["events", options],
    queryFn: () =>
      $fetchEvents({
        data: {
          artist: options?.artist,
          eraId: options?.eraId,
        },
      }),
  });
}

export function eventCollectionsQuery(eventId: string) {
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

export function paginatedEventsQuery(artists?: string[]) {
  return infiniteQueryOptions({
    queryKey: ["events", "paginated", artists],
    queryFn: ({ pageParam }) =>
      $fetchPaginatedEvents({ data: { artists, cursor: pageParam } }),
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
