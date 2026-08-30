import {
  OverlayIcon,
  OverlayIconButton,
} from "@/components/objekt/overlay/corner-overlay";
import { m } from "@/i18n/messages";
import { IconSquare, IconSquareCheckFilled } from "@tabler/icons-react";
import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  isSelected: boolean;
};

/**
 * Batch-select toggle for an overlay action row. Selection state and payload
 * are the caller's concern — this only renders the toggle affordance.
 */
export default function SelectToggleButton({ isSelected, ...props }: Props) {
  return (
    <OverlayIconButton
      {...props}
      aria-label={
        isSelected ? m.objekt_overlay_deselect() : m.objekt_overlay_select()
      }
    >
      <OverlayIcon icon={isSelected ? IconSquareCheckFilled : IconSquare} />
    </OverlayIconButton>
  );
}
