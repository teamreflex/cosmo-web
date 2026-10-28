import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { lazyWithPreload } from "@/lib/lazy";
import type { ObjektList } from "@apollo/database/web/types";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

const BatchSelectionActions = lazyWithPreload(
  () => import("./batch-selection-actions"),
);

type Props = {
  objektLists: ObjektList[];
};

/**
 * Floating bottom bar for the batch-selection flow, rendered only for a viewer who can select. It clears the
 * selection on unmount so it doesn't bleed to other routes. Its actions mount straight away, hidden until something
 * is selected, so their chunk loads (and React's one suspend for a lazy component happens) before the first selection.
 */
export default function BatchSelectionBar({ objektLists }: Props) {
  const reset = useObjektSelection((state) => state.reset);

  useEffect(() => () => reset(), [reset]);

  return (
    // a chunk that failed to load leaves the page without the bar rather than replacing it
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <BatchSelectionActions objektLists={objektLists} />
      </Suspense>
    </ErrorBoundary>
  );
}
