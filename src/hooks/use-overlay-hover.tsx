import { Hoverable } from "@/components/objekt/common";
import { useState } from "react";

export default function useOverlayHover() {
  const [state, setState] = useState<Hoverable>();

  const createProps = (hoverable: Hoverable) => ({
    onMouseEnter: () => setState(hoverable),
    onMouseLeave: () => setState(undefined),
  });

  return [state, createProps] as const;
}
