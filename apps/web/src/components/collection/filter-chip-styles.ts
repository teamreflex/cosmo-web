import { cn } from "@/lib/utils";

/**
 * Chip styles, shared with chips that open something other than a popover.
 */
export function filterChipClassName(active: boolean | undefined) {
  return cn(
    "inline-flex h-8 items-center gap-2 rounded-sm border bg-transparent px-2.5 text-xs font-medium transition-colors hover:bg-accent",
    active
      ? "border-cosmo/80 bg-cosmo/10 text-foreground"
      : "border-border text-foreground",
  );
}

export function filterChipValueClassName(active: boolean | undefined) {
  return cn(
    "-my-1 flex items-center gap-1.5 border-l pl-2 text-xs",
    active
      ? "border-cosmo/40 text-foreground"
      : "border-border text-muted-foreground",
  );
}
