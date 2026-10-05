import {
  CornerOverlay,
  OverlayActionRow,
  OverlayHoverTarget,
  OverlayIcon,
  OverlayIconButton,
  OverlayStatusRail,
} from "@/components/objekt/overlay/corner-overlay";
import OverlayStatus from "@/components/objekt/overlay/overlay-status";
import useOverlayHover from "@/hooks/use-overlay-hover";
import { useWatchCollection } from "@/hooks/use-watch-collection";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconEye, IconEyeFilled } from "@tabler/icons-react";
import { Button } from "../ui/button";

type Props = {
  collection: Pick<Objekt.Collection, "slug" | "collectionId">;
};

/**
 * Labelled watch toggle for the listings dialog.
 */
export function WatchButton({ collection }: Props) {
  const { watching, toggle, isPending } = useWatchCollection(collection);
  const Icon = watching ? IconEyeFilled : IconEye;

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={watching}
      onClick={toggle}
      disabled={isPending}
      className={cn(watching && "border-cosmo/50 bg-cosmo/15 text-cosmo-text")}
    >
      <Icon />
      {watching ? m.watch_watching() : m.watch_watch()}
    </Button>
  );
}

/**
 * Top-left action chip on market cards with the watch toggle.
 */
export function WatchOverlay({ collection }: Props) {
  const { watching, toggle, isPending } = useWatchCollection(collection);
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();

  return (
    <CornerOverlay corner="top-left" {...hoverContainerProps}>
      <OverlayActionRow>
        <OverlayHoverTarget {...createHoverProps("watch")}>
          <OverlayIconButton
            onClick={(event) => {
              // the card itself opens the listings
              event.stopPropagation();
              toggle();
            }}
            disabled={isPending}
            aria-pressed={watching}
            aria-label={
              watching
                ? m.watch_aria_unwatch({ collection: collection.collectionId })
                : m.watch_aria_watch({ collection: collection.collectionId })
            }
            className="outline-hidden"
          >
            <OverlayIcon icon={watching ? IconEyeFilled : IconEye} />
          </OverlayIconButton>
        </OverlayHoverTarget>
      </OverlayActionRow>

      <OverlayStatusRail>
        <OverlayStatus>
          {watching
            ? hoverState === "watch"
              ? m.watch_stop()
              : m.watch_watching()
            : m.watch_watch()}
        </OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}
