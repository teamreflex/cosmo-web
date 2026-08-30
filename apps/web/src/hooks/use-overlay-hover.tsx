import type { Hoverable } from "@/lib/client/objekt-util";
import { useState } from "react";

/**
 * Tracks which overlay element is hovered. Elements set the state via
 * createProps; it only clears when the pointer leaves the container carrying
 * containerProps, so crossing the gaps between buttons doesn't flicker the
 * status text through the un-hovered fallback.
 */
export default function useOverlayHover() {
  const [state, setState] = useState<Hoverable>();

  const createProps = (hoverable: Hoverable) => ({
    onMouseEnter: () => setState(hoverable),
  });

  const containerProps = {
    onMouseLeave: () => setState(undefined),
  };

  return [state, createProps, containerProps] as const;
}
