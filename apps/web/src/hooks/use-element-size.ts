import { useCallback, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "usehooks-ts";
import type { RefObject } from "react";

type Size = {
  width: number;
  height: number;
};

export const useElementSize = <T extends HTMLElement = HTMLDivElement>(): [
  RefObject<T | null>,
  Size,
] => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const updateSize = useCallback(() => {
    const element = ref.current;
    if (element) {
      const { width, height } = element.getBoundingClientRect();
      setSize({ width, height });
    }
  }, []);

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
  }, [updateSize]);

  return [ref, size];
};
