import { cn } from "@/lib/utils";
import { IconArrowDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type SortDir = "asc" | "desc";

type Props = {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: ReactNode;
};

/**
 * Header sort toggle for the detail dialog lists; shows the direction arrow
 * only while active.
 */
export default function SortButton({ active, dir, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 transition-colors",
        active
          ? "border-border bg-muted text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{children}</span>
      {active && (
        <IconArrowDown
          className={cn(
            "size-3 transition-transform",
            dir === "asc" && "rotate-180",
          )}
        />
      )}
    </button>
  );
}
