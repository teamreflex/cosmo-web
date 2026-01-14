import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { m } from "@/i18n/messages";
import { paginatedGravitiesQuery } from "@/lib/queries/gravity";
import type { CosmoArtistBFF } from "@apollo/cosmo/types/artists";
import type { GravityWithPoll } from "@apollo/database/web/types";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";
import GravityTypeBadge from "./gravity-type-badge";

type Props = {
  selectedArtists: string[] | undefined;
  artists: Record<string, CosmoArtistBFF>;
};

export default function GravityList({ selectedArtists, artists }: Props) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(paginatedGravitiesQuery(selectedArtists));

  const allGravities = data.pages.flatMap((page) => page.gravities);

  if (allGravities.length === 0) {
    return (
      <p className="col-span-full mt-4 rounded-lg border border-dashed border-accent bg-background/60 py-12 text-center text-muted-foreground backdrop-blur-md md:mx-auto md:w-1/2">
        {m.gravity_error_loading()}
      </p>
    );
  }

  return (
    <>
      <Card className="py-0">
        <CardContent className="flex flex-col overflow-hidden p-0 text-sm md:grid md:grid-cols-[auto_1fr_auto_auto]">
          {allGravities.map((gravity) => (
            <GravityRow
              key={gravity.id}
              gravity={gravity}
              artist={artists[gravity.artist.toLowerCase()]}
            />
          ))}
        </CardContent>
      </Card>

      <InfiniteQueryNext
        status="success"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

type GravityRowProps = {
  gravity: GravityWithPoll;
  artist: CosmoArtistBFF | undefined;
};

function GravityRow({ gravity, artist }: GravityRowProps) {
  return (
    <Link
      preload={false}
      to="/gravity/$artist/$id"
      params={{ artist: gravity.artist, id: gravity.cosmoId.toString() }}
      className="flex flex-col gap-2 border-b border-accent p-3 transition-colors last:border-b-0 hover:bg-secondary/40 md:col-span-full md:grid md:grid-cols-subgrid md:items-center md:gap-4 md:px-4 md:py-2"
    >
      {/* Mobile: Row 1 / Desktop: Columns 1-2 */}
      <div className="flex items-start gap-3 md:contents">
        {/* Image thumbnail */}
        <img
          src={gravity.image}
          alt={gravity.title}
          className="size-10 shrink-0 rounded object-cover md:size-12"
        />

        {/* Title */}
        <div className="flex min-w-0 flex-col">
          <span className="leading-tight font-semibold">{gravity.title}</span>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2 md:contents">
        {/* Mobile: Row 2 / Desktop: Column 3 */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconCalendarEvent className="size-4" />
          <div className="flex gap-1">
            <span>{format(gravity.startDate, "MMM d, yyyy")}</span>
            <span>~</span>
            <span>{format(gravity.endDate, "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Mobile: Row 3 / Desktop: Column 4 */}
        <div className="flex items-center justify-end gap-4">
          <GravityTypeBadge type={gravity.gravityType} />

          {artist && (
            <div className="flex aspect-square shrink-0 items-center rounded-full ring-2 ring-accent">
              <img
                src={artist.logoImageUrl}
                alt={artist.title}
                className="size-8 rounded-full"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
