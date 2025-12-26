import { queryOptions } from "@tanstack/react-query";
import { $getSpotifyAlbum } from "@/lib/server/events/actions";
import {
  $fetchCollectionsForEvent,
  $fetchEras,
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

export function spotifyAlbumQuery(albumId: string) {
  return queryOptions({
    queryKey: ["spotify-album", albumId],
    queryFn: () => $getSpotifyAlbum({ data: { albumId } }),
    staleTime: 1000 * 60 * 60, // 1 hour - album data rarely changes
  });
}
