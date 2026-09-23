import type { ReactNode } from "react";

/**
 * The row of tiles inside a profile shelf. Wraps onto new rows from md up,
 * and scrolls sideways on a phone like the member filter.
 */
export default function ShelfRow({ children }: { children: ReactNode }) {
  return (
    <div className="container no-scrollbar flex gap-x-3 gap-y-3.5 overflow-x-auto py-3.5 md:flex-wrap md:overflow-visible">
      {children}
    </div>
  );
}
