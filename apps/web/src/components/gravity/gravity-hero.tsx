import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import type { GravityWithPoll } from "@apollo/database/web/types";
import { IconCalendarEvent } from "@tabler/icons-react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import Countdown from "./countdown";
import GravityTypeBadge from "./gravity-type-badge";

type Props = {
  gravities: GravityWithPoll[];
  artists: Record<string, CosmoArtistBFF>;
};

export default function GravityHero({ gravities, artists }: Props) {
  if (gravities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {gravities.map((gravity) => (
        <GravityHeroCard
          key={gravity.id}
          gravity={gravity}
          artist={artists[gravity.artist.toLowerCase()]}
        />
      ))}
    </div>
  );
}

type GravityHeroCardProps = {
  gravity: GravityWithPoll;
  artist: CosmoArtistBFF | undefined;
};

function GravityHeroCard({ gravity, artist }: GravityHeroCardProps) {
  return (
    <Link
      to="/gravity/$artist/$id"
      params={{ artist: gravity.artist, id: gravity.cosmoId.toString() }}
    >
      <Card className="mx-auto h-36 w-full flex-row gap-0 overflow-hidden border border-cosmo p-0 lg:w-2/3 xl:w-1/2">
        <CardContent className="flex w-full px-0">
          {/* Image */}
          <img
            src={gravity.image}
            alt={gravity.title}
            className="aspect-square h-full shrink-0"
          />

          {/* Content */}
          <div className="flex flex-1 flex-col gap-2 p-4">
            {/* Title */}
            <h2 className="text-lg font-semibold">{gravity.title}</h2>

            {/* Dates */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <IconCalendarEvent className="size-4" />
              <ClientOnly
                fallback={<Skeleton className="h-5 w-24 rounded-full" />}
              >
                <div className="flex flex-col sm:contents">
                  {gravity.pollStartDate !== null && (
                    <span>
                      {format(gravity.pollStartDate, "MMM d, yyyy h:mm a")}
                    </span>
                  )}
                  <span className="hidden sm:block">~</span>
                  {gravity.pollEndDate !== null && (
                    <span>
                      {format(gravity.pollEndDate, "MMM d, yyyy h:mm a")}
                    </span>
                  )}
                </div>
              </ClientOnly>
            </div>

            {/* Badge + Artist */}
            <div className="mt-auto flex items-center gap-3">
              {artist && (
                <div className="flex aspect-square shrink-0 items-center rounded-full ring-2 ring-accent">
                  <img
                    src={artist.logoImageUrl}
                    alt={artist.title}
                    className="size-6 rounded-full"
                  />
                </div>
              )}

              <GravityTypeBadge type={gravity.gravityType} />

              {gravity.pollStartDate && gravity.pollEndDate && (
                <Countdown
                  className="ml-auto"
                  pollStartDate={gravity.pollStartDate}
                  pollEndDate={gravity.pollEndDate}
                  gravityEndDate={gravity.endDate}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
