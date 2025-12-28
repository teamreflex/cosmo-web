import AddCollectionsDialog from "./add-collections-dialog";
import DeleteEvent from "./delete-event";
import EditEventDialog from "./edit-event-dialog";
import ViewCollectionsDialog from "./view-collections-dialog";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import type { EventWithEra } from "@apollo/database/web/types";
import EventTypeBadge from "@/components/events/event-type-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timestamp } from "@/components/ui/timestamp";
import { cn } from "@/lib/utils";

type Props = {
  event: EventWithEra;
  artist: CosmoArtistWithMembersBFF | undefined;
};

export default function EventCard({ event, artist }: Props) {
  const artistName = artist?.title ?? event.artist;
  const imageUrl = event.era.spotifyAlbumArt || event.era.imageUrl;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.era.name}
              className="aspect-square size-16 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
              <span className="text-xs text-muted-foreground">No art</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <h2 className="truncate text-lg font-medium">{event.name}</h2>
            <p className="text-sm text-muted-foreground">
              {`${event.era.name} • ${artistName}`}
            </p>
          </div>
        </div>

        <p
          className={cn(
            "line-clamp-2 text-xs text-muted-foreground",
            !event.description && "italic",
          )}
        >
          {event.description ?? "No description added"}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold">Timeframe:</span>
          {event.startDate ? (
            <Timestamp date={event.startDate} format="MMM d, yyyy" />
          ) : (
            <span className="italic">unset</span>
          )}
          <span>~</span>
          {event.endDate ? (
            <Timestamp date={event.endDate} format="MMM d, yyyy" />
          ) : (
            <span className="italic">unset</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <EventTypeBadge eventType={event.eventType} />
          <div className="flex gap-1">
            <AddCollectionsDialog eventId={event.id} eventName={event.name} />
            <ViewCollectionsDialog eventId={event.id} eventName={event.name} />
            <EditEventDialog event={event} />
            <DeleteEvent eventId={event.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
