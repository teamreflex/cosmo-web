import {
  CornerOverlay,
  OverlayActionRow,
  OverlayIcon,
  OverlayIconButton,
  OverlayStatusRail,
} from "@/components/objekt/overlay/corner-overlay";
import OverlayStatus from "@/components/objekt/overlay/overlay-status";
import { Button } from "@/components/ui/button";
import { usePinnedBinder, useToggleBinderPin } from "@/hooks/use-binder-pin";
import { m } from "@/i18n/messages";
import { type BinderPreview, binderTextColour } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import {
  IconLoader2,
  IconPin,
  IconPinFilled,
  IconPinnedOff,
} from "@tabler/icons-react";
import type { SyntheticEvent } from "react";

type OverlayProps = {
  binder: BinderPreview;
  /** the owner can unpin; everyone else sees the pin */
  isOwner: boolean;
};

/**
 * A pinned binder's corner overlay, the same chip pinned objekts carry, in the
 * binder's spine colour. It sits beside the cover inside an `@container`
 * the cover's width, so its corner can match the cover's radius.
 */
export default function BinderPinOverlay({ binder, isOwner }: OverlayProps) {
  return (
    <CornerOverlay
      corner="top-left"
      style={{
        "--objekt-background-color": binder.colour,
        "--objekt-text-color": binderTextColour(binder.colour),
      }}
      className="z-2 rounded-tl-[2.4cqw]"
    >
      <OverlayActionRow>
        {isOwner ? (
          <UnpinButton binder={binder} />
        ) : (
          <OverlayIcon icon={IconPin} />
        )}
      </OverlayActionRow>
      <OverlayStatusRail>
        <OverlayStatus>{m.objekt_overlay_pinned()}</OverlayStatus>
      </OverlayStatusRail>
    </CornerOverlay>
  );
}

// pin cells open the viewer and start a drag from anywhere inside them
const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

function UnpinButton({ binder }: { binder: BinderPreview }) {
  const mutation = useToggleBinderPin(binder);

  return (
    <OverlayIconButton
      disabled={mutation.isPending}
      aria-label={m.binder_unpin_named({ name: binder.name })}
      onClick={(event) => {
        event.stopPropagation();
        mutation.mutate(false);
      }}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onKeyDown={stopPropagation}
    >
      {mutation.isPending ? (
        <OverlayIcon icon={IconLoader2} className="animate-spin" />
      ) : (
        <OverlayIcon icon={IconPinnedOff} />
      )}
    </OverlayIconButton>
  );
}

type ButtonProps = {
  /** the route param, which keys the profile's pins */
  username: string;
  binder: BinderPreview;
  className?: string;
};

/**
 * The owner's pin toggle in the binder viewer, beside Share. It waits for the
 * profile's pins to know which way it points.
 */
export function BinderPinButton({ username, binder, className }: ButtonProps) {
  const pinned = usePinnedBinder(username, binder.id);
  const mutation = useToggleBinderPin(binder);

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={pinned === true}
      disabled={pinned === undefined || mutation.isPending}
      onClick={() => mutation.mutate(pinned !== true)}
      className={cn(
        pinned === true &&
          "border-cosmo bg-cosmo/12 text-cosmo-text hover:bg-cosmo/20 hover:text-cosmo-text dark:border-cosmo dark:bg-cosmo/12 dark:hover:bg-cosmo/20",
        className,
      )}
    >
      {mutation.isPending ? (
        <IconLoader2 className="animate-spin" />
      ) : pinned === true ? (
        <IconPinFilled />
      ) : (
        <IconPin />
      )}
      {pinned === true ? m.binder_pinned() : m.binder_pin()}
    </Button>
  );
}
