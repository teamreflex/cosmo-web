import { motion } from "motion/react";
import { IconBrandTwitter, IconPhoto } from "@tabler/icons-react";
import EventTypeBadge from "./event-type-badge";
import type { EventWithEra } from "@apollo/database/web/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

type EventHeaderProps = {
  event: EventWithEra;
};

const FALLBACK_COLOR = "#8b5cf6"; // cosmo brand purple

export default function EventHeader({ event }: EventHeaderProps) {
  const imageUrl = event.era.spotifyAlbumArt || event.era.imageUrl;
  const dominantColor = event.era.dominantColor || FALLBACK_COLOR;

  return (
    <div className="relative min-h-108 overflow-hidden md:min-h-120">
      {/* image and dominant color layers */}
      {imageUrl && (
        <>
          {/* Dominant color gradient base */}
          <div
            className="absolute inset-x-0 -top-14 bottom-0 bg-linear-to-b from-(--album-color) via-(--album-color)/70 to-(--album-color)/20"
            style={{ "--album-color": dominantColor } as React.CSSProperties}
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
      <div className="relative z-10 flex flex-col gap-4 px-4 py-8 md:container md:px-0">
        <motion.div
          className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
        >
          {/* era image */}
          <div className="shrink-0 drop-shadow-2xl">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={event.era.name}
                className="size-48 rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex size-48 flex-col items-center justify-center rounded-lg bg-muted shadow-2xl">
                <IconPhoto className="size-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-2 text-white drop-shadow-lg">
            <h1 className="font-cosmo text-4xl uppercase md:text-5xl">
              {event.name}
            </h1>
            {event.description && (
              <p className="max-w-2xl text-sm text-white/90 md:text-base">
                {event.description}
              </p>
            )}
          </div>
        </motion.div>

        {/* Badges and actions - overlaid on background */}
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <EventTypeBadge
            eventType={event.eventType}
            className="backdrop-blur-sm"
          />
          {event.era.name && (
            <Badge
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm"
            >
              {event.era.name}
            </Badge>
          )}
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

          <div
            id="objekt-total"
            className="ml-auto text-white/90 drop-shadow-lg"
          />
        </motion.div>
      </div>
    </div>
  );
}
