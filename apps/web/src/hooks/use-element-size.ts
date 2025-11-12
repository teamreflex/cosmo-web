import { useCallback, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "usehooks-ts";
import type { RefObject } from "react";

type Axis = "width" | "height" | "both";

type Options = {
  axis?: Axis;
};

type Size = {
  width: number;
  height: number;
};

export const useElementSize = <T extends HTMLElement = HTMLDivElement>(
  options?: Options,
): [RefObject<T | null>, Size] => {
  const axis: Axis = options?.axis ?? "both";
  const trackWidth = axis !== "height";
  const trackHeight = axis !== "width";
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const updateSize = useCallback(() => {
    const element = ref.current;
    if (element) {
      const { width, height } = element.getBoundingClientRect();
      setSize((previous) => {
        const nextWidth = trackWidth ? width : previous.width;
        const nextHeight = trackHeight ? height : previous.height;

        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return { width: nextWidth, height: nextHeight };
      });
    }
  }, [trackHeight, trackWidth]);

  useIsomorphicLayoutEffect(() => {
    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        resizeObserver.unobserve(ref.current);
      }
    };
  }, [trackHeight, trackWidth, updateSize]);

  return [ref, size];
};
