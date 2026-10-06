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
import {
  useWatchCollection,
  type WatchCollection,
} from "@/hooks/use-watch-collection";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconEye, IconEyeFilled } from "@tabler/icons-react";
import { Suspense } from "react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

type Props = {
  collection: Pick<Objekt.Collection, "slug" | "collectionId">;
};

/**
 * Labelled watch toggle for the listings and metadata dialogs; icon-only on
 * phones. Dialogs can open on routes that never prefetched the watched slugs,
 * so it suspends on its own rather than holding up the dialog.
 */
export function WatchButton(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="size-8 rounded-sm sm:w-20" />}>
      <WatchToggleButton {...props} />
    </Suspense>
  );
}

function WatchToggleButton({ collection }: Props) {
  const { watching, toggle, isPending } = useWatchCollection(collection);
  const Icon = watching ? IconEyeFilled : IconEye;

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={watching}
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "max-sm:w-8 max-sm:px-0",
        watching && "border-cosmo/50 bg-cosmo/15 text-cosmo-text",
      )}
    >
      <Icon />
      <span className="max-sm:sr-only">
        {watching ? m.watch_watching() : m.watch_watch()}
      </span>
    </Button>
  );
}

/**
 * Top-left action chip on market cards with the watch toggle.
 */
export function WatchOverlay({ collection }: Props) {
  const watch = useWatchCollection(collection);
  const [hoverState, createHoverProps, hoverContainerProps] = useOverlayHover();

  return (
    <CornerOverlay corner="top-left" {...hoverContainerProps}>
      <OverlayActionRow>
        <OverlayHoverTarget {...createHoverProps("watch")}>
          <WatchIconButton collection={collection} watch={watch} />
        </OverlayHoverTarget>
      </OverlayActionRow>

      <OverlayStatusRail>
        <OverlayStatus>
          {watch.watching
            ? hoverState === "watch"
              ? m.watch_stop()
              : m.watch_watching()
            : m.watch_watch()}
        </OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}

/**
 * Eye toggle for a card's corner overlay. The overlay owns the watch state so
 * its status text can follow it.
 */
export function WatchIconButton({
  collection,
  watch,
}: Props & { watch: WatchCollection }) {
  return (
    <OverlayIconButton
      onClick={watch.toggle}
      disabled={watch.isPending}
      aria-pressed={watch.watching}
      aria-label={
        watch.watching
          ? m.watch_aria_unwatch({ collection: collection.collectionId })
          : m.watch_aria_watch({ collection: collection.collectionId })
      }
      className="outline-hidden"
    >
      <OverlayIcon icon={watch.watching ? IconEyeFilled : IconEye} />
    </OverlayIconButton>
  );
}
