import { motion } from "motion/react";
import {
  IconBrandTwitter,
  IconCalendarEvent,
  IconPhoto,
} from "@tabler/icons-react";
import { Timestamp } from "../ui/timestamp";
import EventTypeBadge from "./event-type-badge";
import type { EventWithEra } from "@apollo/database/web/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { getSeasonKeys } from "@/hooks/use-filter-data";

type EventHeaderProps = {
  event: EventWithEra;
};

export default function EventHeader({ event }: EventHeaderProps) {
  const imageUrl =
    event.imageUrl || event.era.imageUrl || event.era.spotifyAlbumArt;
  const dominantColor = event.era.dominantColor || "#8b5cf6"; // cosmo purple

  return (
    <div className="relative min-h-108 overflow-hidden md:min-h-120">
      {/* image and dominant color layers */}
      {imageUrl && (
        <>
          {/* Dominant color gradient base */}
          <div
            className="absolute inset-x-0 -top-14 bottom-0 bg-linear-to-b from-(--album-color) via-(--album-color)/70 to-(--album-color)/20"
            style={{ "--album-color": dominantColor }}
          />

          {/* Blurred album art overlay */}
          <div className="absolute inset-x-0 -top-14 bottom-0 opacity-50">
            <img
              src={imageUrl}
              alt={event.era.name}
              aria-hidden="true"
              className="size-full scale-110 object-cover blur-[30px]"
            />
          </div>
        </>
      )}

      {/* fade to background layer */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background to-transparent" />

      {/* inner content */}
      <div className="relative z-10 flex flex-col gap-4 px-4 py-8 md:container">
        <motion.div
          className="flex max-h-32 flex-col gap-4 md:max-h-48 md:flex-row md:items-end md:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
        >
          {/* event/era image */}
          <div className="mx-auto shrink-0 drop-shadow-2xl md:mx-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={event.name}
                className="size-32 rounded-lg shadow-2xl md:size-48"
              />
            ) : (
              <div className="flex size-32 flex-col items-center justify-center rounded-lg bg-muted shadow-2xl md:size-48">
                <IconPhoto className="size-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 text-white drop-shadow-lg">
            <div className="flex items-center justify-between gap-2">
              {/* start/end dates */}
              {event.startDate !== null && (
                <div className="flex items-center justify-center gap-2 text-xs md:justify-start">
                  <IconCalendarEvent className="size-4" />
                  <Timestamp date={event.startDate} format="MMM d, yyyy" />
                  <span>~</span>
                  {event.endDate ? (
                    <Timestamp date={event.endDate} format="MMM d, yyyy" />
                  ) : (
                    <span className="italic">Present</span>
                  )}
                </div>
              )}

              {/* objekt total */}
              <div
                id="objekt-total"
                className="ml-auto text-sm text-white/90 drop-shadow-lg md:text-base"
              />
            </div>

            {/* badges/info */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <EventTypeBadge
                eventType={event.eventType}
                className="backdrop-blur-sm"
              />

              <Badge variant="event-era">
                {(event.era.imageUrl || event.era.spotifyAlbumArt) && (
                  <img
                    src={
                      event.era.imageUrl ||
                      event.era.spotifyAlbumArt ||
                      undefined
                    }
                    alt={event.era.name}
                    className="size-3.5 rounded-xs"
                  />
                )}

                {event.era.name}
              </Badge>

              <Seasons seasons={event.seasons} />

              {event.twitterUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                  asChild
                >
                  <a
                    href={event.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconBrandTwitter className="size-4" />
                    {m.event_announcement()}
                  </a>
                </Button>
              )}
            </div>

            {/* title */}
            <div className="@container w-full overflow-hidden">
              <h1 className="font-cosmo text-[clamp(0.875rem,2cqw,3rem)] whitespace-nowrap uppercase md:text-[clamp(1.25rem,2.5cqw,3.5rem)]">
                {event.name}
              </h1>
            </div>

            {/* description */}
            {event.description && (
              <p className="line-clamp-4 text-sm md:text-base">
                {event.description}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Seasons(props: { seasons: string[] }) {
  const seasons = getSeasonKeys(props.seasons);

  return (
    <>
      {seasons.map(({ key, name }) => (
        <Badge key={name} variant={`season-${key}` as "season-atom"}>
          {name}
        </Badge>
      ))}
    </>
  );
}
