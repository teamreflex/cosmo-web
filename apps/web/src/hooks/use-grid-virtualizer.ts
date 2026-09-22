import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Virtualizer } from "@tanstack/react-virtual";
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
    ...gridOptions({ count, lanes, gap, itemHeight }),
    scrollMargin: container.current?.offsetTop ?? 0,
  });

  return snapshot(virtualizer);
}

type ElementOptions = Options & {
  scrollElement: RefObject<HTMLElement | null>;
};

/**
 * The same grid virtualizer against a scrolling element instead of the window,
 * for grids inside a scrolling panel such as the binder picker. The scroll
 * element must be positioned, so the grid's `offsetTop` is its offset inside
 * that element (0 when the grid is its first child). Opts out of the React
 * Compiler for the same reasons as `useGridVirtualizer`.
 */
export function useGridElementVirtualizer({
  count,
  lanes,
  gap,
  itemHeight,
  container,
  scrollElement,
}: ElementOptions) {
  "use no memo";
  // oxlint-disable-next-line react/incompatible-library -- this hook already opts out of the compiler
  const virtualizer = useVirtualizer({
    ...gridOptions({ count, lanes, gap, itemHeight }),
    getScrollElement: () => scrollElement.current,
    scrollMargin: container.current?.offsetTop ?? 0,
  });

  return snapshot(virtualizer);
}

/**
 * Options shared by both grid virtualizers: one lane per column and a fixed
 * row height, measured up front rather than from the DOM.
 */
function gridOptions({
  count,
  lanes,
  gap,
  itemHeight,
}: Omit<Options, "container">) {
  return {
    count,
    lanes,
    gap,
    // overscan is counted in items, so scale it to keep ~3 rows buffered
    overscan: lanes * 3,
    estimateSize: () => itemHeight,
    measureElement: () => itemHeight,
  };
}

function snapshot<TScrollElement extends Element | Window>(
  virtualizer: Virtualizer<TScrollElement, Element>,
) {
  return {
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollMargin: virtualizer.options.scrollMargin,
    measureElement: virtualizer.measureElement,
    measure: virtualizer.measure,
  };
}
