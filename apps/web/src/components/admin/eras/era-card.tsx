import { getRouteApi } from "@tanstack/react-router";
import EditEraDialog from "./edit-era-dialog";
import type { Era } from "@apollo/database/web/types";
import { Card, CardContent } from "@/components/ui/card";
import { Timestamp } from "@/components/ui/timestamp";
import { cn } from "@/lib/utils";

const route = getRouteApi("/admin/eras");

type Props = {
  era: Era;
};

export default function EraCard({ era }: Props) {
  const { artists } = route.useLoaderData();

  const artist = artists.find((a) => a.id === era.artist);

  return (
    <EditEraDialog era={era}>
      <Card className="cursor-pointer transition-colors hover:bg-accent">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {era.spotifyAlbumArt ? (
              <img
                src={era.spotifyAlbumArt}
                alt={era.name}
                className="size-16 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
                <span className="text-xs text-muted-foreground">No art</span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <h2 className="truncate text-lg font-medium">{era.name}</h2>
              <p className="text-sm text-muted-foreground">
                {artist?.title ?? era.artist}
              </p>
            </div>
          </div>

          <p
            className={cn(
              "line-clamp-2 text-xs text-muted-foreground",
              !era.description && "italic",
            )}
          >
            {era.description ?? "No description added"}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">Timeframe:</span>
            {era.startDate ? (
              <Timestamp date={era.startDate} format="MMM d, yyyy" />
            ) : (
              <span className="italic">unset</span>
            )}
            <span>~</span>
            {era.endDate ? (
              <Timestamp date={era.endDate} format="MMM d, yyyy" />
            ) : (
              <span className="italic">unset</span>
            )}
          </div>
        </CardContent>
      </Card>
    </EditEraDialog>
  );
}
