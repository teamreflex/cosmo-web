import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { $getSpotifyAlbum } from "@/lib/server/events/actions";
import {
  $fetchCollectionsForEvent,
  $fetchEras,
  $fetchEventBySlug,
  $fetchEventObjekts,
  $fetchEvents,
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
