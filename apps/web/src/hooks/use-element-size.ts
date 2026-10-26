import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { useIsomorphicLayoutEffect } from "usehooks-ts";

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

  /**
   * Layout sizes rather than getBoundingClientRect, which would include a
   * transform such as a dialog's zoom-in and keep that size once it ends,
   * since a transform never fires the observer.
   */
  const setMeasured = useCallback(
    (width: number, height: number) => {
      setSize((previous) => {
        const nextWidth = trackWidth ? width : previous.width;
        const nextHeight = trackHeight ? height : previous.height;

        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return { width: nextWidth, height: nextHeight };
      });
    },
    [trackHeight, trackWidth],
  );

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setMeasured(element.offsetWidth, element.offsetHeight);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0];
      if (box) setMeasured(box.inlineSize, box.blockSize);
    });
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [setMeasured]);

  return [ref, size];
};
