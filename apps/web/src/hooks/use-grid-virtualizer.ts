import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

type Options = {
  count: number;
  lanes: number;
  gap: number;
  itemHeight: number;
  container: RefObject<HTMLElement | null>;
};

/**
 * Window virtualizer for the objekt grid, kept out of the React Compiler.
 * The compiler treats the virtualizer instance as immutable and would cache
 * `getVirtualItems()` from the first render (TanStack/virtual#736), so this hook
 * opts out and hands the compiled grid a fresh snapshot every render. It also
 * owns the ref read behind `scrollMargin`, which the compiler rejects in render.
 */
export function useGridVirtualizer({
  count,
  lanes,
  gap,
  itemHeight,
  container,
}: Options) {
  "use no memo";
  const virtualizer = useWindowVirtualizer({
    count,
    lanes,
    gap,
    // overscan is counted in items, so scale it to keep ~3 rows buffered
    overscan: lanes * 3,
    estimateSize: () => itemHeight,
    measureElement: () => itemHeight,
    scrollMargin: container.current?.offsetTop ?? 0,
  });

  return {
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollMargin: virtualizer.options.scrollMargin,
    measureElement: virtualizer.measureElement,
    measure: virtualizer.measure,
  };
}
