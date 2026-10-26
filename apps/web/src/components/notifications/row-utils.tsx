import type { ReactNode } from "react";

export const rowClassName =
  "relative flex gap-3 py-3 pr-8 pl-3.5 transition-colors hover:bg-accent data-[unread=true]:bg-accent/40 data-[unread=true]:hover:bg-accent";

/**
 * Bolds the names a notification's sentence wraps in `{#b}`.
 */
export const bold = {
  b: ({ children }: { children?: ReactNode }) => (
    <b className="font-semibold text-foreground">{children}</b>
  ),
};
