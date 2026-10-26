import type { PropsWithChildren } from "react";

/**
 * The listing page's action bar on phones, pinned to the bottom of the
 * screen so the viewer's next step stays in reach. Wider screens show the
 * same actions in the page header instead.
 */
export default function ListingBottomBar({ children }: PropsWithChildren) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="container flex min-h-16 items-center gap-3 py-3">
        {children}
      </div>
    </div>
  );
}
