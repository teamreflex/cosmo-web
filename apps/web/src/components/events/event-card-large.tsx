import EventTypeBadge from "@/components/events/event-type-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timestamp } from "@/components/ui/timestamp";
import type { EventWithEra } from "@apollo/database/web/types";
import { IconCalendarEvent, IconPhoto } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

type EventCardLargeProps = {
  event: EventWithEra;
  isActive?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const EASING = [0.4, 0.0, 0.2, 1] as const;

export default function EventCardLarge(props: EventCardLargeProps) {
  const eraImageUrl =
    props.event.era.imageUrl || props.event.era.spotifyAlbumArt;
  const eventImageUrl = props.event.imageUrl || eraImageUrl;

  return (
    <Link
      to="/events/$slug"
      params={{ slug: props.event.slug }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      className="block"
    >
      <motion.div
        animate={{
          scale: props.isActive ? 1 : 0.85,
          opacity: props.isActive ? 1 : 0.6,
        }}
        transition={{ duration: 0.3, ease: EASING }}
        className="h-full"
      >
        <Card className="group relative h-full overflow-clip py-0 transition-colors hover:border-foreground/50">
          <CardContent className="flex h-full flex-col px-0">
            {/* Image */}
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {eventImageUrl !== null ? (
                <img
                  src={eventImageUrl}
                  alt={props.event.name}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <IconPhoto className="size-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex min-h-0 flex-col gap-1 p-4">
              {/* Title */}
              <h3 className="line-clamp-2 leading-tight font-semibold">
                {props.event.name}
              </h3>

              {/* Description - fixed height */}
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {props.event.description || "\u00A0"}
              </p>

              {/* Metadata */}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {/* Dates */}
                {props.event.startDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconCalendarEvent className="size-3.5 shrink-0" />
                    <Timestamp
                      date={props.event.startDate}
                      format="MMM d, yyyy"
                    />
                    <span>~</span>
                    {props.event.endDate ? (
                      <Timestamp
                        date={props.event.endDate}
                        format="MMM d, yyyy"
                      />
                    ) : (
                      <span className="italic">Present</span>
                    )}
                  </div>
                )}
              </div>

              {/* badges */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Type badge */}
                <EventTypeBadge eventType={props.event.eventType} />

                {/* Era badge */}
                <Badge variant="event-era">
                  {eraImageUrl !== null && (
                    <img
                      src={eraImageUrl}
                      alt={props.event.era.name}
                      className="size-3.5 rounded-xs"
                    />
                  )}
                  <span>{props.event.era.name}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
