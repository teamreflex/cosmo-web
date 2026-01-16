import type { EventWithEra } from "@apollo/database/web/types";
import { AnimatePresence, motion } from "motion/react";

type EventsBackgroundProps = {
  event: EventWithEra | null;
};

const EASING = [0.4, 0.0, 0.2, 1] as const;

export default function EventsBackground({ event }: EventsBackgroundProps) {
  const imageUrl =
    event?.imageUrl ||
    event?.era.imageUrl ||
    event?.era.spotifyAlbumArt ||
    null;
  const dominantColor =
    event?.dominantColor || event?.era.dominantColor || null;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          className="pointer-events-none absolute inset-x-0 -top-14 h-[60vh] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASING }}
        >
          {/* Dominant color gradient base */}
          <div
            className="absolute inset-0 bg-linear-to-b from-(--album-color) via-(--album-color)/70 to-(--album-color)/20"
            style={{ "--album-color": dominantColor } as React.CSSProperties}
          />

          {/* Blurred album art overlay */}
          {imageUrl && (
            <div className="absolute inset-0 opacity-50">
              <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="size-full scale-110 object-cover blur-[30px]"
              />
            </div>
          )}

          {/* fade to background layer */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
